/**
 * Supertools
 *
 * Let any LLM write code that calls your tools.
 * 10x faster. 90% cheaper.
 *
 * @example
 * ```ts
 * import { supertools, defineTool, z, SANDBOX_TEMPLATE } from '@supertools-ai/core';
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
 * const sandbox = await Sandbox.create(SANDBOX_TEMPLATE);
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

// Sandbox template - use this with E2B
export { SANDBOX_TEMPLATE } from "./constants";
export type { CreateExecutorOptions } from "./executor";
// Low-level executor (for advanced usage)
export { createExecutor, ProgrammaticExecutor } from "./executor";
// MCP integration
export {
  buildMcpSystemPrompt,
  createHostMcpServer,
  extractCode,
  HostMcpServer,
  type HostMcpServerConfig,
  type McpEvent,
  type McpServerConfig,
  type McpTool,
  type McpToolCallRequest,
  type McpToolCallResult,
  type ZodToMcpOptions,
  zodToolsToMcp,
  zodToolToMcp,
} from "./mcp";
export type { SupertoolsConfig, SupportedProvider } from "./supertools";
// Main API
export { detectProvider, supertools } from "./supertools";
export type { NormalizedParameter, NormalizedTool, Tool, ToolDefinition } from "./tool";
// Tool definitions
export { defineTool, isTool, normalizeTools, z } from "./tool";
// Types
export type {
  ExecutionEvent,
  ExecutionResult,
  ExecutorConfig,
  GeneratedCode,
  LLMAdapter,
  ProgrammaticResult,
  ToolCallRequest,
  ToolCallResponse,
  ToolCollection,
} from "./types";
// Errors
export {
  CodeGenerationError,
  ConfigurationError,
  ExecutionError,
  OPTError,
  RelayConnectionError,
  RelayTimeoutError,
  SandboxError,
  ToolError,
} from "./utils/errors";
// Utilities (for advanced usage)
export { generateTypeHints } from "./utils/type-hints";
