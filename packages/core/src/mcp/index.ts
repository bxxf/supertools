/**
 * MCP Integration
 *
 * Unified MCP protocol for tool communication.
 * All tools (Zod and external MCP) are accessed through this interface.
 */

// Host MCP server
export {
  createHostMcpServer,
  HostMcpServer,
  type HostMcpServerConfig,
  type McpEvent,
  type ToolCallEvent,
  type ToolErrorEvent,
  type ToolResultEvent,
} from "./host-server";
// MCP prompts for code generation
export { buildMcpSystemPrompt, extractCode } from "./prompts";
// Types
export type {
  McpConfig,
  McpContent,
  McpErrorMessage,
  McpExecuteRequest,
  McpInputSchema,
  McpListToolsRequest,
  McpListToolsResult,
  McpMessage,
  McpResultMessage,
  McpServerConfig,
  McpTool,
  McpToolCallRequest,
  McpToolCallResult,
  McpToolDefinition,
} from "./types";
// Zod to MCP conversion
export {
  generateMcpTypeHints,
  type ZodToMcpOptions,
  zodToolsToMcp,
  zodToolToMcp,
} from "./zod-to-mcp";
