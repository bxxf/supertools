/**
 * Supertools
 *
 * Let any LLM write code that calls your tools.
 * 10x faster. 90% cheaper.
 *
 * @example
 * ```ts
 * import { supertools, defineTool, z } from '@supertools-ai/core';
 * import { Sandbox } from 'e2b';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const queryDb = defineTool({
 *   name: 'queryDatabase',
 *   description: 'Execute a SQL query',
 *   parameters: z.object({
 *     sql: z.string().describe('The SQL query to execute'),
 *   }),
 *   execute: async ({ sql }) => db.query(sql),
 * });
 *
 * // Create sandbox and wrap your SDK client
 * const sandbox = await Sandbox.create('supertools-bun-014');
 * const client = supertools(new Anthropic(), { tools: [queryDb], sandbox });
 *
 * // Use exactly like normal - tools execute automatically
 * const response = await client.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'List all admin users' }],
 * });
 * ```
 *
 * @packageDocumentation
 */

// Main API
export { supertools, detectProvider } from './supertools';
export type { SupertoolsConfig, SupportedProvider } from './supertools';

// Tool definitions
export { defineTool, z } from './tool';
export type { Tool, ToolDefinition } from './tool';

// Low-level executor (for advanced usage)
export { createExecutor, ProgrammaticExecutor } from './executor';
export type { CreateExecutorOptions } from './executor';

// Types
export type {
  ToolCollection,
  ExecutionResult,
  GeneratedCode,
  ProgrammaticResult,
  ToolCallRequest,
  ToolCallResponse,
  LLMAdapter,
  ExecutorConfig,
  ExecutionEvent,
} from './types';

// Errors
export {
  OPTError,
  CodeGenerationError,
  ExecutionError,
  ToolError,
  RelayConnectionError,
  RelayTimeoutError,
  SandboxError,
  ConfigurationError,
} from './utils/errors';

// Utilities (for advanced usage)
export { buildSystemPrompt, extractCode } from './prompts';
export { generateTypeHints } from './utils/type-hints';
export { normalizeTools, isTool } from './tool';
export type { NormalizedTool, NormalizedParameter } from './tool';

