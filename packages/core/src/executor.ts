/**
 * Programmatic Executor
 *
 * Orchestrates the complete flow:
 * 1. LLM generates JavaScript code using MCP tool definitions
 * 2. Code executes in secure E2B Bun sandbox
 * 3. Tool calls relay back to host via MCP router
 * 4. Results return to user
 */

import { randomUUID } from 'node:crypto';
import type { Sandbox } from 'e2b';
import { RelayClient } from './relay/client';
import { DEFAULT_RELAY_CONFIG, type RelayConfig } from './relay/types';
import { RelayConnectionError, CodeGenerationError } from './utils/errors';
import type { NormalizedTool } from './tool';
import { normalizeTools } from './tool';
import type { ExecutorConfig, ExecutionResult, ProgrammaticResult, LLMAdapter, ExecutionEvent } from './types';
import { zodToolsToMcp, buildMcpSystemPrompt, extractCode, type McpTool } from './mcp';

export interface CreateExecutorOptions extends ExecutorConfig {
  readonly llm: LLMAdapter;
}

export function createExecutor(options: CreateExecutorOptions): ProgrammaticExecutor {
  return new ProgrammaticExecutor(options);
}

export class ProgrammaticExecutor {
  private readonly normalizedTools: NormalizedTool[];
  private readonly mcpTools: McpTool[];
  private readonly toolsMap: Map<string, NormalizedTool>;
  private readonly llm: LLMAdapter;
  private readonly sandbox: Sandbox;
  private readonly debug: boolean;
  private readonly onEvent?: (event: ExecutionEvent) => void;
  private readonly systemPrompt: string;
  private readonly localToolsCache: Record<string, string>;

  constructor(options: CreateExecutorOptions) {
    this.normalizedTools = normalizeTools(options.tools);
    this.toolsMap = new Map(this.normalizedTools.map((t) => [t.name, t]));
    this.llm = options.llm;
    this.sandbox = options.sandbox;
    this.debug = options.debug ?? false;
    this.onEvent = options.onEvent;
    this.mcpTools = zodToolsToMcp(options.tools, { serverName: 'host' });
    // Pre-compute system prompt once
    this.systemPrompt = buildMcpSystemPrompt(this.mcpTools, options.instructions);
    // Pre-compute local tools map once
    this.localToolsCache = Object.fromEntries(
      this.normalizedTools.filter((t) => t.localCode).map((t) => [t.name, t.localCode!])
    );
  }

  private emit(event: ExecutionEvent): void {
    this.onEvent?.(event);
  }

  async run(userRequest: string): Promise<ProgrammaticResult> {
    const totalStart = Date.now();

    if (this.debug) {
      this.log('Generating code for:', userRequest);
    }

    const token = randomUUID();
    const relayConfig = { ...DEFAULT_RELAY_CONFIG, token, debug: this.debug };

    // Run code gen + relay connection in parallel (sandbox already provided)
    const relayUrl = this.sandbox.getHost(relayConfig.port);
    const wsUrl = `wss://${relayUrl}/ws`;

    const codeGenStart = Date.now();
    const relayConnectStart = Date.now();

    const [generated, relayClient] = await Promise.all([
      this.generateCode(userRequest, this.systemPrompt).then((r) => {
        this.logTiming('Code generation', codeGenStart);
        return r;
      }),
      this.connectRelay(wsUrl, token).then((r) => {
        this.logTiming('Relay connect', relayConnectStart);
        return r;
      }),
    ]);

    const code = extractCode(generated.code);
    this.log('Generated code:', code.replace(/\s+/g, ' '));
    this.log('LLM Usage (in tokens):', generated.usage?.inputTokens);
    this.log('LLM Usage (out tokens):', generated.usage?.outputTokens);

    this.emit({ type: 'code_generated', code, explanation: generated.explanation });
    this.emit({ type: 'sandbox_ready', sandboxId: this.sandbox.sandboxId });

    const result = await this.executeCodeWithRelay(code, relayClient, relayConfig);

    this.logTiming('Total', totalStart);

    return {
      code,
      explanation: generated.explanation,
      result: { ...result, executionTimeMs: Date.now() - totalStart },
      usage: generated.usage,
    };
  }

  async executeCode(code: string): Promise<ExecutionResult> {
    const token = randomUUID();
    const relayConfig = { ...DEFAULT_RELAY_CONFIG, token, debug: this.debug };

    const relayUrl = this.sandbox.getHost(relayConfig.port);
    const wsUrl = `wss://${relayUrl}/ws`;
    const relayClient = await this.connectRelay(wsUrl, token);

    return this.executeCodeWithRelay(code, relayClient, relayConfig);
  }

  private async executeCodeWithRelay(
    code: string,
    relayClient: RelayClient,
    relayConfig: RelayConfig
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      this.log('Executing code directly via relay...');
      const execStart = Date.now();

      // Send code to relay with local tool code for sandbox execution
      // Host tools: mcp.call('host.tool_name', args)
      // Local tools: mcp.call('local.tool_name', args)
      relayClient.execute(code, [], this.localToolsCache);

      // Wait for result or error (use configured timeout)
      const timeoutMs = relayConfig.timeout * 1000;
      const result = await relayClient.waitForResult(timeoutMs);
      this.logTiming('Code execution', execStart);

      if (result.success) {
        this.emit({ type: 'complete', success: true, output: '' });
        return {
          success: true,
          output: '',
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        const error = result.error ?? 'Execution failed';
        this.emit({ type: 'complete', success: false, output: '', error });
        return {
          success: false,
          output: '',
          error,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } finally {
      await this.cleanup(relayClient);
    }
  }

  getTools(): readonly NormalizedTool[] {
    return this.normalizedTools;
  }

  getMcpTools(): readonly McpTool[] {
    return this.mcpTools;
  }

  getToolDocumentation(): string {
    return this.systemPrompt.split('<available_tools>')[1]?.split('</available_tools>')[0]?.trim() ?? '';
  }

  private async generateCode(request: string, systemPrompt: string) {
    try {
      return await this.llm.generateCode(request, systemPrompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Detect common errors and provide cleaner messages
      if (message.includes('Could not resolve authentication')) {
        throw new CodeGenerationError(
          'Missing ANTHROPIC_API_KEY. Set it with: export ANTHROPIC_API_KEY=your-key'
        );
      }
      if (message.includes('not_found_error') && message.includes('model:')) {
        const modelMatch = message.match(/model:\s*([^\s"]+)/);
        const model = modelMatch?.[1] || 'unknown';
        throw new CodeGenerationError(
          `Model "${model}" not found. Try: claude-sonnet-4-5 or claude-haiku-4-5`
        );
      }
      if (message.includes('invalid_api_key') || message.includes('Invalid API Key')) {
        throw new CodeGenerationError(
          'Invalid ANTHROPIC_API_KEY. Check your key at console.anthropic.com'
        );
      }

      throw new CodeGenerationError(`Failed to generate code: ${message}`);
    }
  }

  private async connectRelay(url: string, token: string): Promise<RelayClient> {
    const client = new RelayClient({
      url,
      token,
      tools: this.toolsMap,
      debug: this.debug,
      timeout: 30_000,
      reconnect: false,
      onEvent: this.onEvent,
    });

    try {
      await client.connect();
      return client;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('ECONNREFUSED') || message.includes('timeout')) {
        throw new RelayConnectionError(
          'Could not connect to sandbox. Make sure E2B sandbox is running and accessible.'
        );
      }

      throw new RelayConnectionError(`Failed to connect to sandbox relay: ${message}`);
    }
  }

  private async cleanup(client: RelayClient | null): Promise<void> {
    if (client) {
      try {
        await client.disconnect();
        this.log('Relay client disconnected');
      } catch (error) {
        // Log actual error for debugging, but don't throw - cleanup must complete
        this.log('Error disconnecting relay:', error instanceof Error ? error.message : error);
      }
    }
    // Note: Sandbox lifecycle is managed by the caller, not the executor
    // This allows sandbox reuse (e.g., via a pool) for multiple requests
  }

  private log(...args: unknown[]): void {
    if (this.debug) console.log('[Executor]', ...args);
  }

  private logTiming(step: string, startTime: number): void {
    if (this.debug) {
      const duration = Date.now() - startTime;
      console.log(`[Timing] ${step}: ${duration}ms`);
    }
  }
}
