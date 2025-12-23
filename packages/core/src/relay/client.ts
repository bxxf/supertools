/**
 * Relay Client - uses WebSocket to communicate with Relay Server to handle tool calls.
 */
import type { NormalizedTool } from '../tool';
import type { ExecutionEvent } from '../types';
import { parseMessage, validateOutgoing, ProtocolError, type ToolCallMessage } from './utils/protocol';

export interface RelayClientConfig {
  url: string;
  token: string;
  tools: Map<string, NormalizedTool>;
  debug?: boolean;
  timeout?: number;
  reconnect?: boolean;
  maxRetries?: number;
  onEvent?: (event: ExecutionEvent) => void;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 5;
const MAX_BACKOFF = 30_000;
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB max message size

interface WebSocketInit {
  headers?: Record<string, string>;
}

export class RelayClient {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private closing = false;
  private readonly config: Required<Omit<RelayClientConfig, 'onEvent'>> & Pick<RelayClientConfig, 'onEvent'>;
  private readonly log: (...args: unknown[]) => void;
  private readonly emit: (event: ExecutionEvent) => void;
  private readonly startTime = Date.now();

  private executionState = {
    resultReceived: false,
    error: null as string | null,
    resolver: null as ((result: { success: boolean; error?: string }) => void) | null,
  };

  /** Reset state before each execution to allow client reuse */
  private resetExecutionState(): void {
    this.executionState = {
      resultReceived: false,
      error: null,
      resolver: null,
    };
  }

  private ts(): string {
    return `+${Date.now() - this.startTime}ms`;
  }

  constructor(config: RelayClientConfig) {
    this.config = {
      url: config.url,
      token: config.token,
      tools: config.tools,
      debug: config.debug ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      reconnect: config.reconnect ?? true,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      onEvent: config.onEvent,
    };
    this.log = this.config.debug ? (...args) => console.log(`[RelayClient ${this.ts()}]`, ...args) : () => {};
    this.emit = config.onEvent ?? (() => {});
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.closing = false;
    await this.createConnection();
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    if (!this.ws) return;

    return new Promise((resolve) => {
      const ws = this.ws!;
      const cleanup = () => {
        this.ws = null;
        resolve();
      };

      const originalOnClose = ws.onclose;
      ws.onclose = (event) => {
        originalOnClose?.call(ws, event);
        cleanup();
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client disconnect');
      } else {
        cleanup();
      }

      // Force cleanup after timeout
      setTimeout(cleanup, 5000);
    });
  }

  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error(`Connection timeout (${this.config.timeout}ms)`));
      }, this.config.timeout);

      this.log(`Connecting to ${this.config.url}`);

      // Pass token via Authorization header (Bun WebSocket supports this)
      this.ws = new WebSocket(this.config.url, {
        headers: { 'Authorization': `Bearer ${this.config.token}` },
      } as WebSocketInit);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.retryCount = 0;
        this.log('Connected');
        resolve();
      };

      this.ws.onmessage = (event) => this.onMessage(event.data);

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        this.log(`Closed: ${event.code} ${event.reason}`);
        this.ws = null;
        if (!this.closing && this.config.reconnect) {
          this.reconnect();
        }
      };

      this.ws.onerror = (event) => {
        clearTimeout(timeout);
        this.log(`Error:`, event);
        reject(new Error('WebSocket error'));
      };
    });
  }

  private async reconnect(): Promise<void> {
    if (this.retryCount >= this.config.maxRetries) {
      this.log(`Max retries (${this.config.maxRetries}) exceeded`);
      return;
    }

    this.retryCount++;
    const baseDelay = Math.min(1000 * Math.pow(2, this.retryCount - 1), MAX_BACKOFF);
    // Add jitter (±30%) to prevent thundering herd
    const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1);
    const delay = Math.round(baseDelay + jitter);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount})`);

    await new Promise((r) => setTimeout(r, delay));
    if (this.closing) return;

    try {
      await this.createConnection();
      this.log('Reconnected');
    } catch (error) {
      this.log(`Reconnect failed: ${error}`);
      if (!this.closing && this.config.reconnect) {
        this.reconnect();
      }
    }
  }

  private onMessage(data: string | ArrayBuffer | Blob): void {
    try {
      // Handle different data types properly
      let text: string;
      let size: number;

      if (typeof data === 'string') {
        text = data;
        size = data.length;
      } else if (data instanceof ArrayBuffer) {
        text = new TextDecoder().decode(data);
        size = data.byteLength;
      } else {
        // Blob - shouldn't happen with WebSocket, but handle gracefully
        this.log('Received Blob data, skipping (not supported)');
        return;
      }

      // Prevent OOM from huge messages
      if (size > MAX_MESSAGE_SIZE) {
        this.log(`Message too large (${size} bytes), max ${MAX_MESSAGE_SIZE}`);
        return;
      }

      const message = parseMessage(text);
      switch (message.type) {
        case 'tool_call':
          // Handle async tool call with proper error catching
          this.handleToolCall(message).catch((error) => {
            this.log(`Unhandled tool call error: ${error}`);
          });
          break;
        case 'result':
          this.executionState.resultReceived = true;
          this.log('RESULT received');
          this.emit({ type: 'result', data: message.data });
          // Resolve waiting promise (event-driven, no polling)
          this.executionState.resolver?.({ success: true });
          this.executionState.resolver = null;
          break;
        case 'error':
          this.executionState.error = (message as { error?: string }).error ?? 'Unknown error';
          this.log('Execution error:', this.executionState.error);
          // Resolve waiting promise with error
          this.executionState.resolver?.({ success: false, error: this.executionState.error });
          this.executionState.resolver = null;
          break;
        case 'ping':
          this.send({ type: 'pong', id: message.id });
          break;
        case 'pong':
          break;
        default:
          this.log(`Unexpected message type: ${message.type}`);
      }
    } catch (error) {
      if (error instanceof ProtocolError) {
        this.log(`Protocol error: ${error.message}`);
      } else {
        this.log(`Message error: ${error}`);
      }
    }
  }

  private async handleToolCall(message: ToolCallMessage): Promise<void> {
    const { id, tool: name, arguments: args } = message;
    const startTime = Date.now();

    this.log(`Tool RECV: ${name}`, args);
    this.emit({ type: 'tool_call', tool: name, arguments: args as Record<string, unknown>, callId: id });

    const tool = this.config.tools.get(name);
    if (!tool) {
      this.emit({ type: 'tool_error', tool: name, error: `Unknown tool: ${name}`, callId: id });
      this.send({ type: 'error', id, error: `Unknown tool: ${name}`, code: 'UNKNOWN_TOOL' });
      return;
    }

    try {
      const result = await tool.execute(args);
      const durationMs = Date.now() - startTime;
      this.log(`Tool DONE: ${name} (${durationMs}ms)`);
      this.emit({ type: 'tool_result', tool: name, result, callId: id, durationMs });
      this.send({ type: 'tool_result', id, success: true, result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Execution failed';
      this.log(`Tool ERROR: ${name} ->`, msg);
      this.emit({ type: 'tool_error', tool: name, error: msg, callId: id });
      this.send({ type: 'tool_result', id, success: false, error: msg.slice(0, 4096) });
    }
  }

  private send(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send: not connected');
      return;
    }
    try {
      validateOutgoing(message);
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      this.log(`Invalid outgoing message:`, message, error);
    }
  }

  /** Send code to relay for direct execution */
  execute(code: string, remoteTools: string[], localTools: Record<string, string> = {}): void {
    // Reset state to allow client reuse
    this.resetExecutionState();

    this.log('CODE sent to sandbox');
    this.log(`Remote tools: ${remoteTools.join(', ') || '(none)'}`);
    this.log(`Local tools: ${Object.keys(localTools).join(', ') || '(none)'}`);
    // Send raw, don't validate (execute is a custom message type)
    this.ws?.send(JSON.stringify({ type: 'execute', code, remoteTools, localTools }));
  }

  /** Wait for result or error from execution (event-driven, no polling) */
  waitForResult(timeoutMs: number): Promise<{ success: boolean; error?: string }> {
    // Check if already resolved (result came before we started waiting)
    if (this.executionState.resultReceived) {
      return Promise.resolve({ success: true });
    }
    if (this.executionState.error) {
      return Promise.resolve({ success: false, error: this.executionState.error });
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.executionState.resolver = null;
        resolve({ success: false, error: 'Execution timeout' });
      }, timeoutMs);

      // Store resolver to be called by onMessage when result/error arrives
      this.executionState.resolver = (result) => {
        clearTimeout(timeout);
        resolve(result);
      };
    });
  }
}

export function createRelayClient(config: RelayClientConfig): RelayClient {
  return new RelayClient(config);
}
