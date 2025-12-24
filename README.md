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

Create a `.env` file with your API keys:
```bash
ANTHROPIC_API_KEY=your-key  # Get at console.anthropic.com
E2B_API_KEY=your-key        # Get at e2b.dev
```

Create `index.ts` and run with `bun run index.ts`:

```typescript
import { supertools, defineTool, z } from '@supertools-ai/core';
import { Sandbox } from 'e2b';
import Anthropic from '@anthropic-ai/sdk';

// Sample data
const orders = [
  { id: 1, customer: 'Alice', total: 150, status: 'completed' },
  { id: 2, customer: 'Bob', total: 75, status: 'pending' },
  { id: 3, customer: 'Alice', total: 200, status: 'completed' },
  { id: 4, customer: 'Charlie', total: 50, status: 'completed' },
];

// Define tools with Zod schemas
const getOrders = defineTool({
  name: 'getOrders',
  description: 'Get orders, optionally filtered by status',
  parameters: z.object({
    status: z.enum(['pending', 'completed']).optional(),
  }),
  returns: z.array(z.object({
    id: z.number(),
    customer: z.string(),
    total: z.number(),
    status: z.string(),
  })),
  execute: async ({ status }) =>
    status ? orders.filter(o => o.status === status) : orders,
});

// Main
const sandbox = await Sandbox.create('supertools-bun').catch((e) => {
  console.error('Failed to create sandbox:', e);
  process.exit(1);
});

try {
  const client = supertools(new Anthropic(), {
    tools: [getOrders],
    sandbox,
    onEvent: (e) => {
      if (e.type === 'tool_call') console.log(`→ ${e.tool}()`);
      if (e.type === 'result') console.log('Result:', e.data);
    },
  });

  await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: 'Get all completed orders and calculate the total revenue',
    }],
  });
} finally {
  await sandbox.kill();
}
```

**What happens:** The LLM writes code that calls `getOrders()`, loops through results, and calculates the sum — all in one API call.

## How It Works

When you ask: *"Query sales for all 50 states, find top 5, email a report"*

The LLM generates JavaScript that runs in a secure sandbox:

```javascript
// All 50 queries execute without LLM round-trips
const states = ['AL', 'AK', 'AZ', /* ... all 50 */];
const results = {};

for (const state of states) {
  const data = await query_database({
    sql: `SELECT SUM(revenue) FROM sales WHERE state = '${state}'`
  });
  results[state] = data[0].sum;
}

// Process data locally (no tokens consumed)
const top5 = Object.entries(results)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

// Format and send
const report = top5.map(([state, rev]) => `${state}: $${rev.toLocaleString()}`).join('\n');
await send_email({
  to: 'ceo@company.com',
  subject: 'Top 5 States Report',
  body: report
});

// Return the result as JSON
return { topStates: top5, reportSent: true };
```

**Result:** 51 tool calls execute in the sandbox with 1 LLM call. Traditional approach would need multiple round-trips with all results in context.

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
import { supertools, defineTool, z } from '@supertools-ai/core';
import { Sandbox } from 'e2b';
import Anthropic from '@anthropic-ai/sdk';

const sandbox = await Sandbox.create('supertools-bun');
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
    // - 'result': Final execution result
    // - 'complete': Execution finished (success or error)
    if (event.type === 'tool_call') console.log(`Calling ${event.tool}...`);
    if (event.type === 'tool_result') console.log(`${event.tool} done in ${event.durationMs}ms`);
    if (event.type === 'result') console.log('Result:', event.data);
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
import { createExecutor, defineTool } from '@supertools-ai/core';
import { Sandbox } from 'e2b';

// Create your own LLM adapter
const myAdapter = {
  async generateCode(request: string, systemPrompt: string) {
    // Call your LLM
    return { code: '...', rawResponse: '...' };
  },
};

const sandbox = await Sandbox.create('supertools-bun');
const executor = createExecutor({
  llm: myAdapter,
  tools: [/* your tools */],
  sandbox,
});

const result = await executor.run('Your natural language request');
console.log(result.code);           // Generated JavaScript
console.log(result.result.output);  // stdout from execution
```

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
                                  │ generates JavaScript
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                        E2B Cloud Sandbox                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                       Generated Code                        │  │
│  │                                                             │  │
│  │   for (const r of regions) {                                │  │
│  │     const data = await query_db({ region: r });             │  │
│  │     results.push(data);                                     │  │
│  │   }                                                         │  │
│  │   await send_email({ to: 'ceo', body: summary });           │  │
│  │   return { regions: results, emailSent: true };             │  │
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
                   │    query_db, send_email    │
                   │      (execute locally)     │
                   └────────────────────────────┘
```

**How it works:**

1. You wrap your SDK client with `supertools()`
2. When you call `client.messages.create()`, supertools intercepts it
3. The LLM generates JavaScript code that calls your tools
4. Code runs in an isolated E2B sandbox (secure, no host access)
5. Tool calls are relayed back to your machine via WebSocket
6. Your tools execute locally with full access to your systems
7. Results flow back to the sandbox, code continues executing
8. Final output returns in the expected SDK response format

> **Note:** The Relay Server runs inside the pre-built `supertools-bun` E2B template. The Relay Client is included in the `@supertools-ai/core` package and runs on your host.

**Security:**
- LLM-generated code runs in isolated cloud containers
- Your tools run locally — the sandbox never has direct access
- WebSocket authenticated with cryptographically secure tokens
- Tokens are single-use and expire with the sandbox

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
