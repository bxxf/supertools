/**
 * MCP Integration
 *
 * Unified MCP protocol for tool communication.
 * All tools (Zod and external MCP) are accessed through this interface.
 */

// Types
export type {
  McpServerConfig,
  McpTool,
  McpInputSchema,
  McpToolCallRequest,
  McpToolCallResult,
  McpContent,
  McpListToolsRequest,
  McpListToolsResult,
  McpToolDefinition,
  McpMessage,
  McpExecuteRequest,
  McpResultMessage,
  McpErrorMessage,
  McpConfig,
} from './types';

// Zod to MCP conversion
export {
  zodToolToMcp,
  zodToolsToMcp,
  generateMcpTypeHints,
  type ZodToMcpOptions,
} from './zod-to-mcp';

// Host MCP server
export {
  HostMcpServer,
  createHostMcpServer,
  type HostMcpServerConfig,
  type McpEvent,
  type ToolCallEvent,
  type ToolResultEvent,
  type ToolErrorEvent,
} from './host-server';

// MCP prompts for code generation
export { buildMcpSystemPrompt, extractCode } from './prompts';
