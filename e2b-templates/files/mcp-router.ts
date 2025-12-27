/**
 * MCP Router
 *
 * Routes MCP tool calls to the appropriate server:
 * - 'host' → routes to host via relay WebSocket
 * - other servers → routes to local MCP servers in sandbox
 */

interface McpToolCall {
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
}

interface McpResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

type RemoteCallFn = (tool: string, args: Record<string, unknown>) => Promise<unknown>;

interface McpServerProcess {
  call(method: string, args: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

export class McpRouter {
  private readonly servers = new Map<string, McpServerProcess>();
  private readonly remoteCall: RemoteCallFn;
  private readonly debug: boolean;

  constructor(remoteCall: RemoteCallFn, debug = false) {
    this.remoteCall = remoteCall;
    this.debug = debug;
  }

  private log(...args: unknown[]): void {
    if (this.debug) console.log('[McpRouter]', ...args);
  }

  /**
   * Register an MCP server for a given name
   */
  registerServer(name: string, server: McpServerProcess): void {
    this.servers.set(name, server);
    this.log(`Registered server: ${name}`);
  }

  /**
   * Main entry point for tool calls from generated code
   * Format: mcp.call('server.tool_name', { args })
   */
  async call(fullName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const [server, tool] = this.parseToolName(fullName);

    this.log(`Calling: ${server}.${tool}`, args);

    // Route to appropriate handler
    if (server === 'host') {
      // Host tools go through the relay
      return this.remoteCall(tool, args);
    }

    // Local MCP server
    const mcpServer = this.servers.get(server);
    if (!mcpServer) {
      throw new Error(`Unknown MCP server: ${server}. Available: host, ${Array.from(this.servers.keys()).join(', ')}`);
    }

    try {
      const result = await mcpServer.call(tool, args);
      this.log(`Result from ${server}.${tool}:`, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${server}.${tool}: ${message}`);
    }
  }

  /**
   * Parse 'server.tool_name' into [server, tool]
   */
  private parseToolName(fullName: string): [string, string] {
    const dotIndex = fullName.indexOf('.');
    if (dotIndex === -1) {
      throw new Error(`Invalid tool name: ${fullName}. Expected format: server.tool_name`);
    }

    const server = fullName.slice(0, dotIndex);
    const tool = fullName.slice(dotIndex + 1);

    if (!server || !tool) {
      throw new Error(`Invalid tool name: ${fullName}. Both server and tool must be non-empty`);
    }

    return [server, tool];
  }

  /**
   * Cleanup all registered servers
   */
  async close(): Promise<void> {
    for (const [name, server] of this.servers) {
      try {
        await server.close();
        this.log(`Closed server: ${name}`);
      } catch (error) {
        this.log(`Error closing ${name}:`, error);
      }
    }
    this.servers.clear();
  }
}

/**
 * Create an MCP router with a remote call function
 */
export function createMcpRouter(remoteCall: RemoteCallFn, debug = false): McpRouter {
  return new McpRouter(remoteCall, debug);
}
