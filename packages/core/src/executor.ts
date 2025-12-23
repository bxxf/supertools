/**
 * Programmatic Executor
 *
 * Orchestrates the complete flow:
 * 1. LLM generates JavaScript code
 * 2. Code executes in secure E2B Bun sandbox
 * 3. Tool calls relay back to host via WebSocket
 * 4. Results return to user
 */

import { randomUUID } from 'node:crypto';
import { Sandbox } from '@e2b/code-interpreter';
import { RelayClient } from './relay/client';
import { DEFAULT_RELAY_CONFIG, type RelayConfig } from './relay/types';
import { buildSystemPrompt, extractCode } from './prompts';
import { generateTypeHints } from './utils/type-hints';
import { RelayConnectionError, CodeGenerationError } from './utils/errors';
import type { NormalizedTool, AnyTool } from './tool';
import { normalizeTools } from './tool';
import type { ExecutorConfig, ExecutionResult, ProgrammaticResult, LLMAdapter, ExecutionEvent } from './types';

export interface CreateExecutorOptions extends ExecutorConfig {
  readonly llm: LLMAdapter;
}

export function createExecutor(options: CreateExecutorOptions): ProgrammaticExecutor {
  return new ProgrammaticExecutor(options);
}

export class ProgrammaticExecutor {
  private readonly originalTools: readonly AnyTool[];
  private readonly normalizedTools: NormalizedTool[];
  private readonly toolsMap: Map<string, NormalizedTool>;
  private readonly llm: LLMAdapter;
  private readonly sandbox: Sandbox;
  private readonly instructions?: string;
  private readonly debug: boolean;
  private readonly onEvent?: (event: ExecutionEvent) => void;

  constructor(options: CreateExecutorOptions) {
    this.originalTools = options.tools;
    this.normalizedTools = normalizeTools(options.tools);
    this.toolsMap = new Map(this.normalizedTools.map((t) => [t.name, t]));
    this.llm = options.llm;
    this.sandbox = options.sandbox;
    this.instructions = options.instructions;
    this.debug = options.debug ?? false;
    this.onEvent = options.onEvent;
  }

  private emit(event: ExecutionEvent): void {
    this.onEvent?.(event);
  }

  async run(userRequest: string): Promise<ProgrammaticResult> {
    const totalStart = Date.now();
    const toolDocs = generateTypeHints(this.originalTools);
    const systemPrompt = buildSystemPrompt(toolDocs, this.instructions);

    this.log('Generating code for:', userRequest.slice(0, 100));

    const token = randomUUID();
    const relayConfig = { ...DEFAULT_RELAY_CONFIG, token, debug: this.debug };

    // Run code gen + relay connection in parallel (sandbox already provided)
    const relayUrl = this.sandbox.getHost(relayConfig.port);
    const wsUrl = `wss://${relayUrl}/ws`;

    const codeGenStart = Date.now();
    const relayConnectStart = Date.now();

    const [generated, relayClient] = await Promise.all([
      this.generateCode(userRequest, systemPrompt).then((r) => {
        this.logTiming('Code generation', codeGenStart);
        return r;
      }),
      this.connectRelay(wsUrl, token).then((r) => {
        this.logTiming('Relay connect', relayConnectStart);
        return r;
      }),
    ]);

    const code = extractCode(generated.code);
    this.log('Generated code:', code.slice(0, 500));

    this.emit({ type: 'code_generated', code, explanation: generated.explanation });
    this.emit({ type: 'sandbox_ready', sandboxId: this.sandbox.sandboxId });

    const result = await this.executeCodeWithRelay(code, relayClient, relayConfig);

    this.logTiming('Total', totalStart);

    return {
      code,
      explanation: generated.explanation,
      result: { ...result, executionTimeMs: Date.now() - totalStart },
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

      // Send code to relay for direct execution (no file write, no process spawn)
      // Remote tools call back to host, local tools run directly in sandbox
      const remoteTools = this.normalizedTools.filter((t) => !t.localCode).map((t) => t.name);
      const localTools = Object.fromEntries(
        this.normalizedTools.filter((t) => t.localCode).map((t) => [t.name, t.localCode!])
      );
      relayClient.execute(code, remoteTools, localTools);

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

  getToolDocumentation(): string {
    return generateTypeHints(this.originalTools);
  }

  private async generateCode(request: string, systemPrompt: string) {
    try {
      return await this.llm.generateCode(request, systemPrompt);
    } catch (error) {
      throw new CodeGenerationError(
        `Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
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
      throw new RelayConnectionError(
        `Failed to connect to relay: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
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
