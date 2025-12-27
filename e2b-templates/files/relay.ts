/**
 * Supertools Relay Server
 *
 * WebSocket relay with Protocol Buffers encoding for bidirectional
 * communication between host and sandbox.
 *
 * Supports MCP-style tool routing via mcp.call('server.tool', args)
 */

import { createMcpRouter, type McpRouter } from "./mcp-router";
import { type DecodedMessage, decode, encode, type MessageType } from "./proto/codec";

const CONFIG = {
  port: 8080,
  host: "0.0.0.0",
  timeout: 30_000,
  maxMessageSize: 10 * 1024 * 1024,
  debug: Bun.env.DEBUG === "true",
} as const;

const log = {
  info: (...args: unknown[]) => CONFIG.debug && console.log("[Relay]", ...args),
  error: (...args: unknown[]) => console.error("[Relay:Error]", ...args),
};

// Cached for performance - avoid recreating on each execution
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

interface PendingCall {
  resolve: (result: { success: boolean; result?: unknown; error?: string }) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface Socket {
  send(data: Uint8Array): void;
  close(): void;
}

class Session {
  private socket: Socket | null = null;
  private token: string | null = null;
  private pending = new Map<string, PendingCall>();

  get connected(): boolean {
    return this.socket !== null;
  }

  attach(socket: Socket): void {
    this.socket = socket;
    log.info("Host connected");
  }

  detach(): void {
    this.pending.forEach(({ resolve, timer }) => {
      clearTimeout(timer);
      resolve({ success: false, error: "Connection closed" });
    });
    this.pending.clear();
    this.socket = null;
    this.token = null;
    log.info("Host disconnected");
  }

  authorize(token: string | null): boolean {
    if (!token) return false;
    if (!this.token) {
      this.token = token;
      return true;
    }
    return token === this.token;
  }

  send(type: MessageType, payload: Record<string, unknown>): void {
    this.socket?.send(encode(type, payload));
  }

  registerCall(id: string): Promise<{ success: boolean; result?: unknown; error?: string }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ success: false, error: "Timeout" });
      }, CONFIG.timeout);

      this.pending.set(id, { resolve, timer });
    });
  }

  resolveCall(id: string, result: { success: boolean; result?: unknown; error?: string }): void {
    const call = this.pending.get(id);
    if (!call) return;

    clearTimeout(call.timer);
    this.pending.delete(id);
    call.resolve(result);
  }
}

class Executor {
  private mcpRouter: McpRouter;

  constructor(private readonly session: Session) {
    // Create MCP router with remote call function
    this.mcpRouter = createMcpRouter((tool, args) => this.callRemote(tool, args), CONFIG.debug);
  }

  async run(
    code: string,
    remoteTools: string[],
    localTools: Record<string, string>
  ): Promise<void> {
    try {
      const bindings = this.buildBindings(remoteTools, localTools);
      const names = Object.keys(bindings);
      const fn = new AsyncFunction(...names, code);
      const result = await fn(...names.map((n) => bindings[n]));

      this.session.send("result", { data: result });
      log.info("Execution complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error("Execution failed:", message);
      this.session.send("error", { error: message });
    }
  }

  private buildBindings(
    _remoteTools: string[],
    localTools: Record<string, string>
  ): Record<string, unknown> {
    // Register local tools as a 'local' MCP server
    if (Object.keys(localTools).length > 0) {
      this.mcpRouter.registerServer("local", this.createLocalServer(localTools));
    }

    // MCP router is the only way to call tools
    // All tools are accessed via: mcp.call('server.tool_name', { args })
    return {
      mcp: {
        call: (fullName: string, args: Record<string, unknown> = {}) =>
          this.mcpRouter.call(fullName, args),
      },
    };
  }

  /**
   * Create a local MCP server that executes tools directly in sandbox
   */
  private createLocalServer(localTools: Record<string, string>): {
    call(method: string, args: Record<string, unknown>): Promise<unknown>;
    close(): Promise<void>;
  } {
    // biome-ignore lint/complexity/noBannedTypes: Function is intentional for dynamic tool compilation
    const compiledTools = new Map<string, Function>();

    // Compile all local tools using Function constructor (safer than eval)
    for (const [name, code] of Object.entries(localTools)) {
      const trimmed = code.trim();
      if (!/^(async\s+)?function\s*\(/.test(trimmed) && !/^\(.*\)\s*=>/.test(trimmed)) {
        throw new Error(`Invalid local tool: ${name}`);
      }
      const fn = new Function(`return (${code})`)();
      if (typeof fn !== "function") {
        throw new Error(`Not a function: ${name}`);
      }
      compiledTools.set(name, fn);
      log.info(`Registered local tool: ${name}`);
    }

    return {
      async call(method: string, args: Record<string, unknown>): Promise<unknown> {
        const fn = compiledTools.get(method);
        if (!fn) {
          throw new Error(`Unknown local tool: ${method}`);
        }
        log.info(`Local tool call: ${method}`);
        return fn(args);
      },
      async close(): Promise<void> {
        compiledTools.clear();
      },
    };
  }

  private async callRemote(name: string, args: Record<string, unknown>): Promise<unknown> {
    const id = crypto.randomUUID();
    const pending = this.session.registerCall(id);

    this.session.send("tool_call", { id, tool: name, arguments: args });
    log.info(`Tool call: ${name}`);

    const result = await pending;
    if (result.success) return result.result;
    throw new Error(`${name}: ${result.error ?? "Tool call failed"}`);
  }
}

class RelayServer {
  private readonly session = new Session();
  private readonly executor = new Executor(this.session);

  start(): void {
    Bun.serve({
      port: CONFIG.port,
      hostname: CONFIG.host,
      fetch: (req, server) => this.handleHttp(req, server),
      websocket: {
        open: (ws) => this.session.attach(ws as unknown as Socket),
        message: (_, data) => this.handleMessage(data as string | ArrayBuffer),
        close: () => this.session.detach(),
      },
    });

    log.info(`Listening on port ${CONFIG.port}`);
  }

  private handleHttp(
    req: Request,
    server: { upgrade(req: Request): boolean }
  ): Response | undefined {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const auth = req.headers.get("Authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!this.session.authorize(token)) {
        return new Response("Unauthorized", { status: 401 });
      }

      return server.upgrade(req) ? undefined : new Response("Upgrade failed", { status: 500 });
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, connected: this.session.connected, encoding: "protobuf" });
    }

    return new Response("Not Found", { status: 404 });
  }

  private handleMessage(data: string | ArrayBuffer): void {
    if (typeof data === "string") {
      this.session.send("error", { error: "Binary protocol required" });
      return;
    }

    if (data.byteLength > CONFIG.maxMessageSize) {
      this.session.send("error", { error: "Message too large" });
      return;
    }

    let msg: DecodedMessage;
    try {
      msg = decode(data);
    } catch {
      this.session.send("error", { error: "Decode failed" });
      return;
    }

    switch (msg.type) {
      case "tool_result":
      case "error":
        if (msg.id) {
          this.session.resolveCall(msg.id, {
            success: msg.success ?? false,
            result: msg.result,
            error: msg.error,
          });
        }
        break;

      case "execute":
        this.executor.run(msg.code ?? "", msg.remoteTools ?? [], msg.localTools ?? {});
        break;

      case "ping":
        if (msg.id) {
          this.session.send("pong", { id: msg.id });
        }
        break;
    }
  }
}

new RelayServer().start();
