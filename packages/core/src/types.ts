import type { Sandbox } from '@e2b/code-interpreter';
import type { AnyTool } from './tool';

export type ToolCollection = readonly AnyTool[];

export interface ExecutionResult {
  readonly success: boolean;
  readonly output: string;
  readonly error?: string;
  readonly executionTimeMs: number;
  readonly images?: readonly string[];
}

export interface GeneratedCode {
  readonly code: string;
  readonly explanation?: string;
  readonly rawResponse?: string;
}

export interface ProgrammaticResult {
  readonly code: string;
  readonly explanation?: string;
  readonly result: ExecutionResult;
}

export interface ToolCallRequest {
  readonly tool: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface ToolCallResponse {
  readonly success: boolean;
  readonly result?: unknown;
  readonly error?: string;
}

export interface LLMAdapter {
  generateCode(userRequest: string, systemPrompt: string): Promise<GeneratedCode>;
}

/**
 * Structured execution events for real-time progress tracking
 */
export type ExecutionEvent =
  | { readonly type: 'code_generated'; readonly code: string; readonly explanation?: string }
  | { readonly type: 'sandbox_ready'; readonly sandboxId: string }
  | { readonly type: 'tool_call'; readonly tool: string; readonly arguments: Record<string, unknown>; readonly callId: string }
  | { readonly type: 'tool_result'; readonly tool: string; readonly result: unknown; readonly callId: string; readonly durationMs: number }
  | { readonly type: 'tool_error'; readonly tool: string; readonly error: string; readonly callId: string }
  | { readonly type: 'result'; readonly data: unknown }
  | { readonly type: 'stdout'; readonly data: string }
  | { readonly type: 'stderr'; readonly data: string }
  | { readonly type: 'complete'; readonly success: boolean; readonly output: string; readonly error?: string };

export interface ExecutorConfig {
  readonly tools: ToolCollection;
  /** Pre-created sandbox - you manage its lifecycle */
  readonly sandbox: Sandbox;
  /** Additional instructions for the LLM */
  readonly instructions?: string;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Callback for structured execution events */
  readonly onEvent?: (event: ExecutionEvent) => void;
}
