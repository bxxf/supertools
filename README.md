# Supertools

<p align="center">
  <img src="https://raw.githubusercontent.com/bxxf/supertools/refs/heads/main/assets/banner.svg" alt="Supertools - Let LLMs write code that calls your tools" width="100%">
</p>

> **🚧 Work in Progress** — This project is under active development. Contributions are welcome, especially for adding support for other AI providers (OpenAI, Vercel AI SDK, etc.)!

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#api">API</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

> Inspired by [Anthropic's Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) — the LLM writes code that orchestrates tools, instead of calling them one by one.

## The Problem

Traditional tool calling has limitations:

- **Loops require enumeration** — querying 50 states means 50 explicit tool calls
- **Results stay in context** — all tool outputs consume tokens on every round-trip
- **Processing needs LLM** — filtering, aggregating, or transforming data requires another LLM call

## The Solution

Supertools lets the LLM write code that runs in a sandbox:

```
User Request → LLM generates code → Sandbox executes → Result
                                         │
                              for (state of states) {
                                await query_db(state)
                              }
                              // Process locally
                              return topResults
```

- **Loops are native** — the LLM writes a `for` loop, not 50 tool calls
- **Processing is free** — filtering/aggregation runs in sandbox, not LLM
- **Only final result** — intermediate data never hits the LLM context

## Quick Start

```bash
bun add @supertools-ai/core @anthropic-ai/sdk e2b
```

```bash
# .env
ANTHROPIC_API_KEY=your-key  # console.anthropic.com
E2B_API_KEY=your-key        # e2b.dev
```

### 1. Define a tool

```typescript
import { defineTool, z } from '@supertools-ai/core';

const orders = [
  { id: 1, customer: 'Alice', total: 150, status: 'completed' },
  { id: 2, customer: 'Bob', total: 75, status: 'pending' },
];

const getOrders = defineTool({
  name: 'getOrders',
  description: 'Get orders, optionally filtered by status',
  parameters: z.object({
    status: z.enum(['pending', 'completed']).optional(),
  }),
  execute: async ({ status }) =>
    status ? orders.filter(o => o.status === status) : orders,
});
```

### 2. Wrap your client

```typescript
import { supertools, SANDBOX_TEMPLATE } from '@supertools-ai/core';
import { Sandbox } from 'e2b';
import Anthropic from '@anthropic-ai/sdk';

const sandbox = await Sandbox.create(SANDBOX_TEMPLATE);

const client = supertools(new Anthropic(), {
  tools: [getOrders],
  sandbox,
  onEvent: (e) => {
    if (e.type === 'result') console.log('Result:', e.data);
  },
});
```

### 3. Use it like normal

```typescript
await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: 'Get completed orders and calculate total revenue',
  }],
});

await sandbox.kill(); // Clean up when done
```

**What happens:** The LLM writes code that calls `getOrders()`, filters results, and calculates the sum — all in one API call.

## How It Works

When you ask: *"Query sales for all 50 states, find top 5, email a report"*

### Traditional Tool Calling

The LLM calls tools one by one, each requiring an API round-trip:

```
User: "Query sales for all 50 states..."
  ↓
LLM → tool_use: query_database({state: 'AL'})  → API call #1
  ↓ result goes back to LLM context
LLM → tool_use: query_database({state: 'AK'})  → API call #2
  ↓ result goes back to LLM context
... 48 more API calls, all results accumulating in context ...
  ↓
LLM → tool_use: send_email({...})              → API call #51
  ↓
LLM: "Done! Here's your report..."             → API call #52
```

**Problems:** 52 API calls, all 50 query results in LLM context (expensive), slow.

### With Supertools

The LLM generates code once, which runs in a sandbox:

```
User: "Query sales for all 50 states..."
  ↓
LLM generates JavaScript                       → API call #1
  ↓
Sandbox executes code:
  ├── query_database('AL') ─┐
  ├── query_database('AK')  ├── WebSocket (fast, parallel)
  ├── ... 48 more ...       │
  ├── send_email()         ─┘
  └── return { topStates, reportSent }
  ↓
Result returned to your app                    → Done!
```

**The generated code:**

```javascript
const states = ['AL', 'AK', 'AZ', /* ... all 50 */];
const results = {};

for (const state of states) {
  const data = await mcp.call('host.query_database', {
    sql: `SELECT SUM(revenue) FROM sales WHERE state = '${state}'`
  });
  results[state] = data[0].sum;
}

const top5 = Object.entries(results)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

await mcp.call('host.send_email', {
  to: 'ceo@company.com',
  subject: 'Top 5 States Report',
  body: top5.map(([state, rev]) => `${state}: $${rev}`).join('\n')
});

return { topStates: top5, reportSent: true };
```

**Result:** 1 API call, 51 tool executions via WebSocket, data processing in sandbox (free), only final result returned.

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         Your Application                          │
│                                                                   │
│  const client = supertools(new Anthropic(), { tools, sandbox });  │
│  const response = await client.messages.create({...});            │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
                   ┌────────────────────────────┐
                   │     Supertools Wrapper     │
                   │   (intercepts SDK calls)   │
                   └──────────────┬─────────────┘
                                  │ LLM generates JavaScript
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                        E2B Cloud Sandbox                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                       Generated Code                        │  │
│  │                                                             │  │
│  │   const [orders, users] = await Promise.all([               │  │
│  │     mcp.call('host.get_orders', {}),                        │  │
│  │     mcp.call('host.get_users', {})                          │  │
│  │   ]);                                                       │  │
│  │   return { orders, users };                                 │  │
│  │                                                             │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │ tool calls via WebSocket          │
│  ┌────────────────────────────▼────────────────────────────────┐  │
│  │                    Relay Server (Bun)                       │  │
│  │                  WebSocket bridge to host                   │  │
│  └────────────────────────────┬────────────────────────────────┘  │
└───────────────────────────────┼───────────────────────────────────┘
                                │ WebSocket (authenticated)
                                ▼
                   ┌────────────────────────────┐
                   │        Relay Client        │
                   │    (runs on your host)     │
                   └──────────────┬─────────────┘
                                  │
                                  ▼
                   ┌────────────────────────────┐
                   │         Your Tools         │
                   │   get_orders, get_users    │
                   │      (execute locally)     │
                   └────────────────────────────┘
```

**Step by step:**

1. You wrap your SDK client with `supertools()`
2. When you call `client.messages.create()`, supertools intercepts it
3. The LLM generates JavaScript code that uses `mcp.call()` for tools
4. Code runs in an isolated E2B sandbox (secure, no host access)
5. Tool calls relay back to your machine via WebSocket
6. Your tools execute locally with full access to your systems
7. Results flow back to the sandbox, code continues executing
8. Final output returns in the expected SDK response format

**Security:**

- LLM-generated code runs in isolated cloud containers
- Your tools run locally — the sandbox never has direct access
- WebSocket authenticated with cryptographically secure tokens
- Tokens are single-use and expire with the sandbox

> **Note:** The Relay Server runs inside the pre-built `SANDBOX_TEMPLATE`. The Relay Client is included in `@supertools-ai/core` and runs on your host.

## MCP Under the Hood

Supertools uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) internally as a unified interface for tool communication. Here's why and how:

### Why MCP?

MCP provides a standardized way to expose tools to LLMs. Instead of inventing a custom protocol, Supertools converts your Zod-defined tools into MCP format:

```
Your Tool (Zod)  →  MCP Tool Definition  →  LLM sees it  →  Generates mcp.call()
```

### How tools are exposed

When you define a tool with `defineTool()`, it gets converted to MCP format with:
- **Name**: `host.your_tool_name` (prefixed with server name)
- **Description**: Your tool's description
- **Input schema**: JSON Schema derived from your Zod parameters
- **Output schema**: JSON Schema from your `returns` Zod schema (if provided)

The LLM then generates code using the `mcp.call()` pattern:

```javascript
// Your tool: getOrders
// Becomes: mcp.call('host.get_orders', { status: 'completed' })

const [orders, users] = await Promise.all([
  mcp.call('host.get_orders', { status: 'completed' }),
  mcp.call('host.get_users', {})
]);
```

### Host vs Local tools

Tools can run in two places:

| Type | Prefix | Where it runs | Use case |
|------|--------|---------------|----------|
| **Host** | `host.` | Your machine | DB queries, API calls, secrets |
| **Local** | `local.` | In sandbox | Pure computation, data transforms |

```typescript
// Host tool - runs on your machine (default)
const queryDb = defineTool({
  name: 'queryDb',
  execute: async ({ sql }) => db.query(sql), // Has access to your DB
});

// Local tool - runs in sandbox (no network round-trip)
const calculateStats = defineTool({
  name: 'calculateStats',
  local: true,  // ← This makes it local
  execute: async ({ values }) => ({
    sum: values.reduce((a, b) => a + b, 0),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
  }),
});
```

Local tools are faster because they don't need a WebSocket round-trip back to your host. Use them for pure computation when all data is already in the sandbox.

## Why Supertools?

<p align="center">
  <img src="https://raw.githubusercontent.com/bxxf/supertools/refs/heads/main/assets/benchmark.svg" alt="Benchmark Results" width="100%">
</p>

The benchmark compares three approaches on the same model (Claude Sonnet 4.5):
- **Native**: Traditional tool calling with LLM round-trips
- **Anthropic Beta**: Anthropic's `code_execution` beta feature
- **Supertools**: Code generation with E2B sandbox execution

> **Note on Anthropic Beta results:** While the `allowed_callers` feature works (tools are called from within the Python code), each tool call still requires a full API round-trip. For N tool calls, you need N+1 API requests - the code execution pauses, returns to your server, you provide the result, and it continues. The only savings are that tool results don't inflate Claude's context. In contrast, Supertools makes 1 API call total - the generated code runs in the sandbox and calls tools via WebSocket without additional API round-trips. This explains the significant performance difference.

> **Note:** Supertools returns raw JSON data, not natural language. The LLM generates code but never sees the execution results. This is ideal for data pipelines and batch operations, but for chatbots needing conversational responses, consider traditional tool calling or add a summarization step.

## API

### `supertools(client, config)`

Wrap any supported LLM SDK client with programmatic tool calling.

```typescript
import { supertools, defineTool, z, SANDBOX_TEMPLATE } from '@supertools-ai/core';
import { Sandbox } from 'e2b';
import Anthropic from '@anthropic-ai/sdk';

const sandbox = await Sandbox.create(SANDBOX_TEMPLATE);
const client = supertools(new Anthropic(), {
  // Required
  tools: [defineTool({ name, description, parameters, execute })],
  sandbox,  // E2B sandbox instance

  // Optional
  debug: false,        // Enable debug logging
  instructions: '...', // Additional instructions for the LLM
  onEvent: (event) => {
    // Available event types:
    // - 'code_generated': LLM generated the code
    // - 'sandbox_ready': Sandbox connection established
    // - 'tool_call': Tool invoked (includes tool name and args)
    // - 'tool_result': Tool completed (includes result and durationMs)
    // - 'tool_error': Tool execution failed
    // - 'result': Final execution result (includes data)
    // - 'execution_error': Sandbox execution failed (includes error message)
    // - 'complete': Execution finished (success or error)
    if (event.type === 'tool_call') console.log(`Calling ${event.tool}...`);
    if (event.type === 'tool_result') console.log(`${event.tool} done in ${event.durationMs}ms`);
    if (event.type === 'result') console.log('Result:', event.data);
    if (event.type === 'execution_error') console.log('Error:', event.error);
  },
});

// Use exactly like the original SDK
const response = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Your request here' }],
});
```

**Supported SDKs:**
- ✅ Anthropic SDK (`@anthropic-ai/sdk`)
- ⏳ OpenAI SDK — [contributions welcome](https://github.com/anthropics/supertools)
- ⏳ Vercel AI SDK — [contributions welcome](https://github.com/anthropics/supertools)
- ⏳ Mastra AI — [contributions welcome](https://github.com/anthropics/supertools)

### `defineTool(config)`

```typescript
const tool = defineTool({
  name: 'searchUsers',           // Must match /^[a-zA-Z][a-zA-Z0-9_]*$/
  description: 'Search users',   // Used in LLM prompt (min 5 chars)
  parameters: z.object({         // Zod schema for inputs
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  returns: z.array(UserSchema),  // Optional: Zod schema for return type (improves LLM accuracy)
  execute: async (params) => {   // Your implementation
    return db.users.search(params);
  },
});
// Note: Tool names are converted to snake_case in sandbox code
// e.g., 'searchUsers' becomes 'search_users' when called

// Local tools run entirely in the sandbox (no network round-trip)
// Use for pure computation when all data is already available
const calculateStats = defineTool({
  name: 'calculateStats',
  description: 'Calculate statistics for numbers',
  parameters: z.object({ values: z.array(z.number()) }),
  returns: z.object({ mean: z.number(), sum: z.number() }),
  local: true,  // Runs in sandbox, not on host
  execute: async ({ values }) => ({
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    sum: values.reduce((a, b) => a + b, 0),
  }),
});
```

### Advanced: Low-level Executor

For more control, use the executor directly:

```typescript
import { createExecutor, defineTool, SANDBOX_TEMPLATE } from '@supertools-ai/core';
import { Sandbox } from 'e2b';

// Create your own LLM adapter
const myAdapter = {
  async generateCode(request: string, systemPrompt: string) {
    // Call your LLM
    return { code: '...', rawResponse: '...' };
  },
};

const sandbox = await Sandbox.create(SANDBOX_TEMPLATE);
const executor = createExecutor({
  llm: myAdapter,
  tools: [/* your tools */],
  sandbox,
});

const result = await executor.run('Your natural language request');
console.log(result.code);           // Generated JavaScript
console.log(result.result.output);  // stdout from execution
```

## When to Use

**Use Supertools when:**
- Calling 3+ tools in sequence
- Processing data (filter/aggregate before returning)
- Parallel operations (query 50 endpoints at once)
- Complex logic (loops, conditionals, early exit)

**Use traditional tool calling when:**
- Single tool calls
- User needs to approve each step
- Tools have dangerous side effects

## Roadmap

**Coming Soon:**
- [x] Publish npm package (`@supertools-ai/core`)
- [x] Publish E2B sandbox template for zero-config setup
- [ ] Support tools from remote MCP servers ie. from the E2B MCP Gateway

**Providers:**
- [x] Anthropic SDK
- [ ] OpenAI SDK
- [ ] Vercel AI SDK
- [ ] Mastra AI

**Future:**
- [ ] Alternative sandbox providers (??)
- [ ] Python SDK (1:1 API parity)

## Requirements

- Node.js 18+ or [Bun](https://bun.sh)
- [E2B](https://e2b.dev) API key (set `E2B_API_KEY` env var)
- [Anthropic](https://anthropic.com) API key (set `ANTHROPIC_API_KEY` env var)

## License

MIT

---

<p align="center">
  Secure sandboxing powered by <a href="https://e2b.dev">E2B</a>
</p>
