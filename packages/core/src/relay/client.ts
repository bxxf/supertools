/**
 * Relay Client
 *  
 *
 * WebSocket client for bidirectional communication with the sandbox relay.
 * Uses Protocol Buffers for efficient binary encoding.
 */

import type { NormalizedTool } from '../tool';
import type { ExecutionEvent } from '../types';
import { encode, decode, type MessageType, type DecodedMessage } from './proto';

// =============================================================================
// Types
// =============================================================================

export interface RelayClientConfig {
  url: string;
  token: string;
  tools: Map<string, NormalizedTool>;
  timeout?: number;
  debug?: boolean;
  reconnect?: boolean;
  maxRetries?: number;
  onEvent?: (event: ExecutionEvent) => void;
}

interface ExecutionState {
  resolved: boolean;
  error: string | null;
  resolver: ((result: { success: boolean; error?: string }) => void) | null;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 5;
const MAX_BACKOFF = 30_000;
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024;

// =============================================================================
// Client
// =============================================================================

export class RelayClient {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private closing = false;
  private readonly config: Required<Omit<RelayClientConfig, 'onEvent'>> & Pick<RelayClientConfig, 'onEvent'>;
  private readonly log: (...args: unknown[]) => void;
  private readonly emit: (event: ExecutionEvent) => void;

  private state: ExecutionState = {
    resolved: false,
    error: null,
    resolver: null,
  };

  constructor(config: RelayClientConfig) {
    this.config = {
      url: config.url,
      token: config.token,
      tools: config.tools,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      debug: config.debug ?? false,
      reconnect: config.reconnect ?? true,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      onEvent: config.onEvent,
    };

    this.log = this.config.debug ? (...args) => console.log('[RelayClient]', ...args) : () => {};
    this.emit = config.onEvent ?? (() => {});
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    this.closing = false;
    await this.createConnection();
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    const ws = this.ws;
    if (!ws) return;

    return new Promise((resolve) => {
      const cleanup = () => {
        this.ws = null;
        resolve();
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.onclose = () => cleanup();
        ws.close(1000, 'Client disconnect');
        setTimeout(cleanup, 5000);
      } else {
        cleanup();
      }
    });
  }

  execute(code: string, remoteTools: string[], localTools: Record<string, string> = {}): void {
    this.resetState();
    this.log('Executing code');
    this.send('execute', { code, remoteTools, localTools });
  }

  waitForResult(timeoutMs: number): Promise<{ success: boolean; error?: string }> {
    if (this.state.resolved) return Promise.resolve({ success: true });
    if (this.state.error) return Promise.resolve({ success: false, error: this.state.error });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.state.resolver = null;
        resolve({ success: false, error: 'Execution timeout' });
      }, timeoutMs);

      this.state.resolver = (result) => {
        clearTimeout(timeout);
        resolve(result);
      };
    });
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private resetState(): void {
    this.state = { resolved: false, error: null, resolver: null };
  }

  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error(`Connection timeout (${this.config.timeout}ms)`));
      }, this.config.timeout);

      this.log(`Connecting to ${this.config.url}`);

      this.ws = new WebSocket(this.config.url, {
        headers: { Authorization: `Bearer ${this.config.token}` },
      } as { headers: Record<string, string> });
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.retryCount = 0;
        this.log('Connected');
        resolve();
      };

      this.ws.onmessage = (event) => this.onMessage(event.data);

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        this.log(`Closed: ${event.code}`);
        this.ws = null;
        if (!this.closing && this.config.reconnect) this.reconnect();
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket error'));
      };
    });
  }

  private async reconnect(): Promise<void> {
    if (this.retryCount >= this.config.maxRetries) {
      this.log(`Max retries exceeded`);
      return;
    }

    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), MAX_BACKOFF);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount})`);

    await new Promise((r) => setTimeout(r, delay));
    if (this.closing) return;

    try {
      await this.createConnection();
    } catch {
      if (!this.closing && this.config.reconnect) this.reconnect();
    }
  }

  private onMessage(data: unknown): void {
    // Detect old JSON-based sandbox template
    if (typeof data === 'string') {
      const error = `Sandbox template version mismatch. You are using an old sandbox template that uses JSON protocol. Please update to 'supertools-bun-014' or later: Sandbox.create('supertools-bun-014')`;
      this.log(error);
      this.state.error = error;
      this.state.resolver?.({ success: false, error });
      this.state.resolver = null;
      return;
    }

    // Normalize binary data to ArrayBuffer (handles Node.js Buffer, Uint8Array, etc.)
    const buffer = this.toArrayBuffer(data);
    if (!buffer) {
      this.log('Expected binary message');
      return;
    }

    if (buffer.byteLength > MAX_MESSAGE_SIZE) {
      this.log(`Message too large: ${buffer.byteLength}`);
      return;
    }

    let msg: DecodedMessage;
    try {
      msg = decode(buffer);
    } catch (e) {
      this.log('Decode error:', e);
      return;
    }

    this.handleMessage(msg);
  }

  private handleMessage(msg: DecodedMessage): void {
    switch (msg.type) {
      case 'tool_call':
        this.handleToolCall(msg.id ?? '', msg.tool ?? '', msg.arguments ?? {});
        break;

      case 'result':
        this.state.resolved = true;
        this.emit({ type: 'result', data: msg.data });
        this.state.resolver?.({ success: true });
        this.state.resolver = null;
        break;

      case 'error':
        this.state.error = msg.error ?? 'Unknown error';
        this.state.resolver?.({ success: false, error: this.state.error });
        this.state.resolver = null;
        break;

      case 'ping':
        this.send('pong', { id: msg.id ?? '' });
        break;
    }
  }

  private async handleToolCall(id: string, name: string, args: Record<string, unknown>): Promise<void> {
    const start = Date.now();
    this.log(`Tool: ${name}`);
    this.emit({ type: 'tool_call', tool: name, arguments: args, callId: id });

    const tool = this.config.tools.get(name);
    if (!tool) {
      this.emit({ type: 'tool_error', tool: name, error: 'Unknown tool', callId: id });
      this.send('tool_result', { id, success: false, error: 'Unknown tool' });
      return;
    }

    try {
      const result = await tool.execute(args);
      const durationMs = Date.now() - start;
      this.emit({ type: 'tool_result', tool: name, result, callId: id, durationMs });
      this.send('tool_result', { id, success: true, result });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Execution failed';
      this.emit({ type: 'tool_error', tool: name, error, callId: id });
      this.send('tool_result', { id, success: false, error });
    }
  }

  private toArrayBuffer(data: unknown): ArrayBuffer | null {
    if (data instanceof ArrayBuffer) {
      return data;
    }

    // Node.js Buffer or Uint8Array (ws library, Bun, etc.)
    if (ArrayBuffer.isView(data)) {
      const { buffer, byteOffset, byteLength } = data;
      if (buffer instanceof ArrayBuffer) {
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
    }

    return null;
  }

  private send(type: MessageType, payload: Record<string, unknown>): void {
    if (!this.connected) {
      this.log('Not connected');
      return;
    }

    try {
      this.ws!.send(encode(type, payload));
    } catch (e) {
      this.log('Send error:', e);
    }
  }
}

export function createRelayClient(config: RelayClientConfig): RelayClient {
  return new RelayClient(config);
}
