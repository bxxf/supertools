/**
 * MCP Integration Types
 *
 * Types for integrating with the Model Context Protocol (MCP).
 * Supports both external MCP servers and Zod-defined tools wrapped as MCP.
 */

/**
 * Configuration for an external MCP server to run in the sandbox
 */
export interface McpServerConfig {
  /** npm package to install (e.g., '@modelcontextprotocol/server-github') */
  readonly package: string;
  /** Environment variables to pass to the server */
  readonly env?: Record<string, string>;
  /** Additional command-line arguments */
  readonly args?: readonly string[];
}

/**
 * Normalized MCP tool representation
 * Both Zod tools and external MCP tools are converted to this format
 */
export interface McpTool {
  /** Tool name (snake_case) */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** JSON Schema for input parameters */
  readonly inputSchema: McpInputSchema;
  /** Optional JSON Schema for return type (improves code generation) */
  readonly outputSchema?: Record<string, unknown>;
  /** Which MCP server this tool belongs to */
  readonly server: string;
}

/**
 * JSON Schema for tool input parameters
 */
export interface McpInputSchema {
  readonly type: "object";
  readonly properties: Record<string, unknown>;
  readonly required?: readonly string[];
}

/**
 * MCP tool call request (JSON-RPC format)
 */
export interface McpToolCallRequest {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: "tools/call";
  readonly params: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  };
}

/**
 * MCP tool call result (JSON-RPC format)
 */
export interface McpToolCallResult {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly result?: {
    readonly content: readonly McpContent[];
    readonly isError?: boolean;
  };
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

/**
 * MCP content types
 */
export type McpContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image"; readonly data: string; readonly mimeType: string }
  | { readonly type: "resource"; readonly uri: string };

/**
 * MCP list tools request
 */
export interface McpListToolsRequest {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: "tools/list";
  readonly params?: Record<string, never>;
}

/**
 * MCP list tools result
 */
export interface McpListToolsResult {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly result: {
    readonly tools: readonly McpToolDefinition[];
  };
}

/**
 * MCP tool definition as returned by listTools
 */
export interface McpToolDefinition {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: McpInputSchema;
}

/**
 * Generic MCP JSON-RPC message
 */
export type McpMessage =
  | McpToolCallRequest
  | McpToolCallResult
  | McpListToolsRequest
  | McpListToolsResult
  | McpExecuteRequest
  | McpResultMessage
  | McpErrorMessage;

/**
 * Execute code request (supertools-specific extension)
 */
export interface McpExecuteRequest {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: "execute";
  readonly params: {
    readonly code: string;
    readonly servers: readonly string[];
  };
}

/**
 * Result message from code execution
 */
export interface McpResultMessage {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: "result";
  readonly params: {
    readonly data: unknown;
  };
}

/**
 * Error message
 */
export interface McpErrorMessage {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: "error";
  readonly params: {
    readonly error: string;
  };
}

/**
 * Configuration for MCP servers in supertools
 */
export interface McpConfig {
  /** External MCP servers to run in sandbox */
  readonly [serverName: string]: McpServerConfig;
}
