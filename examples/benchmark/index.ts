/**
 * Supertools Benchmark
 *
 * Compares three approaches to tool calling:
 *
 * | Approach        | API Calls | How it works                                    |
 * |-----------------|-----------|------------------------------------------------|
 * | Native          | N+1       | Claude thinks between each tool call            |
 * | Anthropic Beta  | N+1       | Code pauses for each tool result                |
 * | Supertools      | 1         | Tools called via WebSocket in sandbox           |
 *
 * Run: bun run examples/benchmark/index.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "e2b";
import { supertools, defineTool, z } from "@supertools-ai/core";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;

const BENCHMARKS = [
  { name: "Simple (1 tool)", prompt: "Get all admin users" },
  { name: "Parallel (2 tools)", prompt: "Get all users and all orders" },
  { name: "Sequential (dependent)", prompt: "Get admin users, then get orders for each admin" },
  { name: "Complex (logic + agg)", prompt: "Get all users, find admins, get their orders, calculate total revenue per admin" },
];

// -----------------------------------------------------------------------------
// Mock Database
// -----------------------------------------------------------------------------

const DB = {
  users: [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" },
    { id: 3, name: "Charlie", role: "user" },
  ],
  orders: [
    { id: 101, userId: 1, total: 150 },
    { id: 102, userId: 2, total: 75 },
    { id: 103, userId: 1, total: 200 },
    { id: 104, userId: 3, total: 50 },
    { id: 105, userId: 1, total: 175 },
  ],
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Metrics {
  timeMs: number;
  apiCalls: number;
  toolCalls: number;
  tokens: number;
}

interface Result {
  native: Metrics;
  anthropicBeta: Metrics;
  supertools: Metrics;
}

// -----------------------------------------------------------------------------
// Shared Tool Logic
// -----------------------------------------------------------------------------

function executeGetUsers(role?: string) {
  return role ? DB.users.filter((u) => u.role === role) : DB.users;
}

function executeGetOrders(userId?: number) {
  return userId ? DB.orders.filter((o) => o.userId === userId) : DB.orders;
}

function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case "getUsers":
      return executeGetUsers(input.role as string | undefined);
    case "getOrders":
      return executeGetOrders(input.userId as number | undefined);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// -----------------------------------------------------------------------------
// Native Tool Calling
// -----------------------------------------------------------------------------

async function runNative(client: Anthropic, prompt: string): Promise<Metrics> {
  const start = Date.now();
  let apiCalls = 0;
  let toolCalls = 0;
  let tokens = 0;

  const tools: Anthropic.Tool[] = [
    {
      name: "getUsers",
      description: "Get users, optionally filtered by role",
      input_schema: {
        type: "object",
        properties: { role: { type: "string", enum: ["admin", "user"] } },
      },
    },
    {
      name: "getOrders",
      description: "Get orders, optionally filtered by userId",
      input_schema: {
        type: "object",
        properties: { userId: { type: "number" } },
      },
    },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  while (true) {
    apiCalls++;
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools,
      messages,
    });

    tokens += res.usage.input_tokens + res.usage.output_tokens;

    if (res.stop_reason === "end_turn") break;

    const toolBlocks = res.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (!toolBlocks.length) break;

    messages.push({ role: "assistant", content: res.content });
    messages.push({
      role: "user",
      content: toolBlocks.map((b) => {
        toolCalls++;
        return {
          type: "tool_result" as const,
          tool_use_id: b.id,
          content: JSON.stringify(executeTool(b.name, b.input as Record<string, unknown>)),
        };
      }),
    });
  }

  return { timeMs: Date.now() - start, apiCalls, toolCalls, tokens };
}

// -----------------------------------------------------------------------------
// Anthropic Beta (code_execution)
// -----------------------------------------------------------------------------

async function runAnthropicBeta(client: Anthropic, prompt: string): Promise<Metrics> {
  const start = Date.now();
  let apiCalls = 0;
  let toolCalls = 0;
  let tokens = 0;

  const tools: Anthropic.Beta.BetaTool[] = [
    { type: "code_execution_20250825", name: "code_execution" } as Anthropic.Beta.BetaTool,
    {
      name: "getUsers",
      description: "Get users, optionally filtered by role. Returns [{id, name, role}].",
      input_schema: {
        type: "object" as const,
        properties: { role: { type: "string", enum: ["admin", "user"] } },
      },
      allowed_callers: ["code_execution_20250825"],
    } as Anthropic.Beta.BetaTool,
    {
      name: "getOrders",
      description: "Get orders, optionally filtered by userId. Returns [{id, userId, total}].",
      input_schema: {
        type: "object" as const,
        properties: { userId: { type: "number" } },
      },
      allowed_callers: ["code_execution_20250825"],
    } as Anthropic.Beta.BetaTool,
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  let container: string | undefined;

  while (true) {
    apiCalls++;

    const res = (await client.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      betas: ["advanced-tool-use-2025-11-20"],
      tools,
      messages,
      ...(container && { container }),
    } as Anthropic.Beta.MessageCreateParams)) as Anthropic.Beta.BetaMessage;

    tokens += res.usage.input_tokens + res.usage.output_tokens;
    container = (res as unknown as { container?: { id: string } }).container?.id;

    if (res.stop_reason === "end_turn") break;

    const toolBlocks = res.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use"
    );

    if (!toolBlocks.length && res.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlock[] });

    if (toolBlocks.length) {
      messages.push({
        role: "user",
        content: toolBlocks.map((b) => {
          toolCalls++;
          return {
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: JSON.stringify(executeTool(b.name, b.input as Record<string, unknown>)),
          };
        }),
      });
    }
  }

  return { timeMs: Date.now() - start, apiCalls, toolCalls, tokens };
}

// -----------------------------------------------------------------------------
// Supertools
// -----------------------------------------------------------------------------

async function runSupertools(client: Anthropic, sandbox: Sandbox, prompt: string): Promise<Metrics> {
  const start = Date.now();
  let apiCalls = 0;
  let toolCalls = 0;
  let tokens = 0;

  const trackedClient = {
    messages: {
      create: async (params: Anthropic.MessageCreateParams) => {
        apiCalls++;
        const res = (await client.messages.create(params)) as Anthropic.Message;
        tokens += res.usage.input_tokens + res.usage.output_tokens;
        return res;
      },
    },
  } as Anthropic;

  const tools = [
    defineTool({
      name: "getUsers",
      description: "Get users, optionally filtered by role",
      parameters: z.object({ role: z.enum(["admin", "user"]).optional() }),
      execute: async ({ role }) => {
        toolCalls++;
        return executeGetUsers(role);
      },
    }),
    defineTool({
      name: "getOrders",
      description: "Get orders, optionally filtered by userId",
      parameters: z.object({ userId: z.number().optional() }),
      execute: async ({ userId }) => {
        toolCalls++;
        return executeGetOrders(userId);
      },
    }),
  ];

  const wrapped = supertools(trackedClient, { tools, sandbox });

  await wrapped.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  return { timeMs: Date.now() - start, apiCalls, toolCalls, tokens };
}

// -----------------------------------------------------------------------------
// Benchmark Runner
// -----------------------------------------------------------------------------

async function runBenchmark(
  client: Anthropic,
  sandbox: Sandbox,
  name: string,
  prompt: string
): Promise<Result> {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`${name}`);
  console.log(`${"─".repeat(70)}`);

  process.stdout.write("[Native]         ");
  const native = await runNative(client, prompt);
  console.log(`${native.timeMs}ms | ${native.apiCalls} calls | ${native.tokens} tok`);

  process.stdout.write("[Anthropic Beta] ");
  const anthropicBeta = await runAnthropicBeta(client, prompt);
  console.log(`${anthropicBeta.timeMs}ms | ${anthropicBeta.apiCalls} calls | ${anthropicBeta.tokens} tok`);

  process.stdout.write("[Supertools]     ");
  const supertoolsResult = await runSupertools(client, sandbox, prompt);
  console.log(`${supertoolsResult.timeMs}ms | ${supertoolsResult.apiCalls} calls | ${supertoolsResult.tokens} tok`);

  return { native, anthropicBeta, supertools: supertoolsResult };
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------

function printSummary(results: Result[]) {
  const sum = (arr: Metrics[], key: keyof Metrics) => arr.reduce((a, b) => a + b[key], 0);

  const totals = {
    native: {
      timeMs: sum(results.map((r) => r.native), "timeMs"),
      apiCalls: sum(results.map((r) => r.native), "apiCalls"),
      tokens: sum(results.map((r) => r.native), "tokens"),
    },
    anthropicBeta: {
      timeMs: sum(results.map((r) => r.anthropicBeta), "timeMs"),
      apiCalls: sum(results.map((r) => r.anthropicBeta), "apiCalls"),
      tokens: sum(results.map((r) => r.anthropicBeta), "tokens"),
    },
    supertools: {
      timeMs: sum(results.map((r) => r.supertools), "timeMs"),
      apiCalls: sum(results.map((r) => r.supertools), "apiCalls"),
      tokens: sum(results.map((r) => r.supertools), "tokens"),
    },
  };

  const speedup = (base: number, comp: number) =>
    comp <= base ? `${(base / comp).toFixed(1)}x faster` : `${(comp / base).toFixed(1)}x slower`;

  const pct = (base: number, comp: number) => {
    const diff = ((base - comp) / base) * 100;
    return diff >= 0 ? `${diff.toFixed(0)}% fewer` : `${Math.abs(diff).toFixed(0)}% more`;
  };

  console.log(`\n${"═".repeat(70)}`);
  console.log("TOTALS");
  console.log(`${"═".repeat(70)}`);
  console.log(`Native:          ${totals.native.timeMs}ms | ${totals.native.apiCalls} calls | ${totals.native.tokens} tok`);
  console.log(`Anthropic Beta:  ${totals.anthropicBeta.timeMs}ms | ${totals.anthropicBeta.apiCalls} calls | ${totals.anthropicBeta.tokens} tok`);
  console.log(`Supertools:      ${totals.supertools.timeMs}ms | ${totals.supertools.apiCalls} calls | ${totals.supertools.tokens} tok`);

  console.log(`\n${"═".repeat(70)}`);
  console.log("SUPERTOOLS vs NATIVE");
  console.log(`${"═".repeat(70)}`);
  console.log(`Time:      ${speedup(totals.native.timeMs, totals.supertools.timeMs)}`);
  console.log(`Tokens:    ${pct(totals.native.tokens, totals.supertools.tokens)}`);
  console.log(`API Calls: ${pct(totals.native.apiCalls, totals.supertools.apiCalls)}`);

  console.log(`\n${"═".repeat(70)}`);
  console.log("SUPERTOOLS vs ANTHROPIC BETA");
  console.log(`${"═".repeat(70)}`);
  console.log(`Time:      ${speedup(totals.anthropicBeta.timeMs, totals.supertools.timeMs)}`);
  console.log(`Tokens:    ${pct(totals.anthropicBeta.tokens, totals.supertools.tokens)}`);
  console.log(`API Calls: ${pct(totals.anthropicBeta.apiCalls, totals.supertools.apiCalls)}`);

}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const client = new Anthropic();

  console.log("Creating E2B sandbox...");
  const sandbox = await Sandbox.create("supertools-bun", { timeoutMs: 5 * 60 * 1000 });
  console.log("Sandbox ready");

  try {
    const results: Result[] = [];

    for (const { name, prompt } of BENCHMARKS) {
      results.push(await runBenchmark(client, sandbox, name, prompt));
    }

    printSummary(results);
  } finally {
    await sandbox.kill();
  }
}

main().catch(console.error);
