const PORT = 8080;
const TIMEOUT = 30;
const DEBUG = Bun.env.DEBUG === 'true';
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB max
const log = (...a: unknown[]) => DEBUG && console.error('[Relay]', ...a);

// WebSocket types for Bun
interface ServerWebSocket {
  send(data: string): void;
  close(): void;
}

interface PendingRequest {
  resolve: (result: { success: boolean; result?: unknown; error?: string }) => void;
  timer: ReturnType<typeof setTimeout>;
}

let sessionToken: string | null = null;
let ws: ServerWebSocket | null = null;
const pending = new Map<string, PendingRequest>();

// Handle tool call request
async function handleToolCall(tool: string, args: Record<string, unknown>): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (!ws) return { success: false, error: 'Host not connected' };
  const id = crypto.randomUUID();
  return new Promise(resolve => {
    const timer = setTimeout(() => { pending.delete(id); resolve({ success: false, error: 'Timeout' }); }, TIMEOUT * 1000);
    pending.set(id, { resolve, timer });
    ws.send(JSON.stringify({ type: 'tool_call', id, tool, arguments: args ?? {} }));
    log('Tool:', tool);
  });
}

// Send result back to host
function sendResult(data: unknown): void {
  if (!ws) {
    log('Cannot send result: host not connected');
    return;
  }
  ws.send(JSON.stringify({ type: 'result', data }));
  log('Result sent');
}

// Execute code directly in this process (no file write, no spawn)
async function executeCode(
  code: string,
  remoteTools: string[],
  localTools: Record<string, string> = {}
): Promise<void> {
  try {
    // Build REMOTE tool functions that call back to host via WebSocket
    const callRemoteTool = async (name: string, args: Record<string, unknown> = {}) => {
      const result = await handleToolCall(name, args);
      if (!result.success) throw new Error(`${name}: ${result.error ?? 'failed'}`);
      return result.result;
    };

    // Build LOCAL tool functions that run directly in sandbox (no network!)
    const buildLocalTool = (name: string, fnCode: string) => {
      // Validate that the code looks like a function before eval
      const trimmed = fnCode.trim();
      const looksLikeFunction = /^(async\s+)?function\s*\(/.test(trimmed) || /^\(.*\)\s*=>/.test(trimmed);
      if (!looksLikeFunction) {
        throw new Error(`Invalid local tool code for ${name}: doesn't look like a function`);
      }

      const fn = eval(`(${fnCode})`);
      if (typeof fn !== 'function') {
        throw new Error(`Invalid local tool code for ${name}: eval result is not a function`);
      }

      return (args: Record<string, unknown> = {}) => fn(args);
    };

    // Create tool function bindings
    const toolBindings: Record<string, Function> = {};
    const allToolNames: string[] = [];

    // Remote tools → call back to host
    for (const name of remoteTools) {
      toolBindings[name] = (args: Record<string, unknown> = {}) => callRemoteTool(name, args);
      allToolNames.push(name);
    }

    // Local tools → run directly in sandbox
    for (const [name, fnCode] of Object.entries(localTools)) {
      toolBindings[name] = buildLocalTool(name, fnCode);
      allToolNames.push(name);
      log('Local tool:', name);
    }

    // Wrap user code to automatically capture return value
    // This way LLM just uses `return` and we handle sending the result
    const wrappedCode = `
      const __execute = async () => {
        ${code}
      };
      return await __execute();
    `;

    // Build and execute
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(...allToolNames, wrappedCode);
    const result = await fn(...allToolNames.map(n => toolBindings[n]));

    // Automatically send the return value as result
    sendResult(result);
    log('Code executed successfully');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log('Code execution error:', msg);
    ws?.send(JSON.stringify({ type: 'error', error: msg }));
  }
}

// Types for Bun.serve
interface BunServer {
  upgrade(req: Request): boolean;
}

// HTTP server for WebSocket (host connection)
Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req: Request, server: BunServer) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      // Get token from Authorization header (more secure than query param)
      const authHeader = req.headers.get('Authorization');
      const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!headerToken) {
        log('No token in Authorization header');
        return new Response('Authorization header required', { status: 401 });
      }

      if (!sessionToken) {
        sessionToken = headerToken;
        log('Session token set');
      } else if (headerToken !== sessionToken) {
        log('Invalid token');
        return new Response('Unauthorized', { status: 401 });
      }

      const upgraded = server.upgrade(req);
      if (!upgraded) return new Response('WebSocket upgrade failed', { status: 500 });
      return undefined;
    }

    if (url.pathname === '/health') {
      return Response.json({ ok: true, connected: !!ws });
    }

    return new Response('', { status: 404 });
  },
  websocket: {
    open(socket: ServerWebSocket) {
      log('Host connected');
      ws = socket;
    },
    message(_socket: ServerWebSocket, data: string | ArrayBuffer) {
      // Check message size to prevent OOM
      const size = typeof data === 'string' ? data.length : (data as ArrayBuffer).byteLength;
      if (size > MAX_MESSAGE_SIZE) {
        log('Message too large:', size);
        ws?.send(JSON.stringify({ type: 'error', error: 'Message too large' }));
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(data));
      } catch (error) {
        log('Invalid JSON received:', error);
        ws?.send(JSON.stringify({ type: 'error', error: 'Invalid JSON message' }));
        return;
      }

      const msgType = msg.type as string;
      const msgId = msg.id as string | undefined;

      if (msgType === 'tool_result' || msgType === 'error') {
        if (msgId) {
          const p = pending.get(msgId);
          if (p) {
            clearTimeout(p.timer);
            pending.delete(msgId);
            p.resolve(msg as { success: boolean; result?: unknown; error?: string });
          }
        }
      } else if (msgType === 'execute') {
        // Execute code directly - no file write, no process spawn
        log('Executing code directly');
        const code = msg.code as string;
        const remoteTools = (msg.remoteTools as string[]) || [];
        const localTools = (msg.localTools as Record<string, string>) || {};
        executeCode(code, remoteTools, localTools);
      } else if (msgType === 'ping' && msgId) {
        ws?.send(JSON.stringify({ type: 'pong', id: msgId }));
      }
    },
    close() {
      log('Host disconnected');
      // Clean up pending requests to prevent memory leak
      for (const [, p] of pending) {
        clearTimeout(p.timer);
        p.resolve({ success: false, error: 'Connection closed' });
      }
      pending.clear();
      ws = null;
      sessionToken = null;
    },
  },
});

log('Relay ready on', PORT);
