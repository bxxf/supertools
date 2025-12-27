/**
 * Host MCP Server
 *
 * Wraps Zod tools in an MCP-compatible interface that runs on the host.
 * Tool calls from the sandbox are routed here via the relay.
 *
 * Note: This doesn't use the MCP SDK - it just provides MCP-compatible
 * tool definitions and handles tool execution.
 */

import type { AnyTool } from "../tool";
import { toSnakeCase } from "../utils/string";
import type { McpContent, McpTool, McpToolCallRequest, McpToolCallResult } from "./types";
import { zodToolsToMcp } from "./zod-to-mcp";

export interface HostMcpServerConfig {
  /** Server name (used for tool routing) */
  name: string;
  /** Debug logging */
  debug?: boolean;
}

export interface ToolCallEvent {
  type: "tool_call";
  tool: string;
  arguments: Record<string, unknown>;
  callId: string;
}

export interface ToolResultEvent {
  type: "tool_result";
  tool: string;
  result: unknown;
  callId: string;
  durationMs: number;
}

export interface ToolErrorEvent {
  type: "tool_error";
  tool: string;
  error: string;
  callId: string;
}

export type McpEvent = ToolCallEvent | ToolResultEvent | ToolErrorEvent;

export class HostMcpServer {
  private readonly tools: Map<string, AnyTool>;
  private readonly mcpTools: McpTool[];
  private readonly config: Required<HostMcpServerConfig>;
  private readonly log: (...args: unknown[]) => void;
  private onEvent?: (event: McpEvent) => void;

  constructor(tools: readonly AnyTool[], config: HostMcpServerConfig) {
    this.config = {
      name: config.name,
      debug: config.debug ?? false,
    };
    this.log = this.config.debug ? (...args) => console.log("[HostMcpServer]", ...args) : () => {};

    // Store tools by snake_case name for lookup
    this.tools = new Map();
    for (const tool of tools) {
      const normalizedName = toSnakeCase(tool.name);
      this.tools.set(normalizedName, tool);
    }

    // Convert to MCP format (JSON Schema)
    this.mcpTools = zodToolsToMcp(tools, { serverName: this.config.name });

    this.log(`Registered ${this.tools.size} tools`);
  }

  /**
   * Get MCP tool definitions for code generation
   */
  getToolDefinitions(): readonly McpTool[] {
    return this.mcpTools;
  }

  /**
   * Set event handler for tool execution events
   */
  setEventHandler(handler: (event: McpEvent) => void): void {
    this.onEvent = handler;
  }

  /**
   * Handle a tool call request from the sandbox
   * This is the main entry point for tool execution
   */
  async handleToolCall(request: McpToolCallRequest): Promise<McpToolCallResult> {
    const { id, params } = request;
    const { name, arguments: args } = params;

    this.log(`Tool call: ${name}`, args);
    const start = Date.now();

    this.onEvent?.({
      type: "tool_call",
      tool: name,
      arguments: args,
      callId: String(id),
    });

    const tool = this.tools.get(name);
    if (!tool) {
      const error = `Unknown tool: ${name}`;
      this.onEvent?.({
        type: "tool_error",
        tool: name,
        error,
        callId: String(id),
      });

      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: error },
      };
    }

    try {
      const result = await tool.execute(args);
      const durationMs = Date.now() - start;

      this.onEvent?.({
        type: "tool_result",
        tool: name,
        result,
        callId: String(id),
        durationMs,
      });

      const content: McpContent[] = [{ type: "text", text: JSON.stringify(result) }];

      return {
        jsonrpc: "2.0",
        id,
        result: { content },
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : "Execution failed";

      this.onEvent?.({
        type: "tool_error",
        tool: name,
        error,
        callId: String(id),
      });

      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: error }], isError: true },
      };
    }
  }

  /**
   * Handle a list tools request
   */
  handleListTools(): { tools: readonly McpTool[] } {
    return { tools: this.mcpTools };
  }
}

/**
 * Create a host MCP server for Zod tools
 */
export function createHostMcpServer(
  tools: readonly AnyTool[],
  config: HostMcpServerConfig
): HostMcpServer {
  return new HostMcpServer(tools, config);
}
