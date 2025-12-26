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
const MAX_TOKENS = 2048;

const BENCHMARKS = [
  { name: "Simple (1 tool)", prompt: "Get all user IDs" },
  { name: "Medium (3 tools)", prompt: "Get user IDs, then get user details for user 1 and user 2" },
  { name: "Sequential (5 tools)", prompt: "Get user IDs, then get user details for the first 4 users" },
  { name: "Heavy (10+ tools)", prompt: "Get all user IDs, then for each of the first 8 users: get their user details AND their orders. Calculate total spending per user." },
  { name: "Insane (30+ tools)", prompt: "Get all user IDs. Then for EVERY user: call getUser to get their details, then call getUserOrders to get their orders. Calculate each user's total spending. Return a report with each user's name and total. You MUST call both getUser and getUserOrders for each user individually." },
];

// -----------------------------------------------------------------------------
// Mock Database
// -----------------------------------------------------------------------------

const DB = {
  users: [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" },
    { id: 3, name: "Charlie", role: "user" },
    { id: 4, name: "Diana", role: "admin" },
    { id: 5, name: "Eve", role: "user" },
    { id: 6, name: "Frank", role: "user" },
    { id: 7, name: "Grace", role: "admin" },
    { id: 8, name: "Henry", role: "user" },
    { id: 9, name: "Ivy", role: "user" },
    { id: 10, name: "Jack", role: "user" },
    { id: 11, name: "Kate", role: "admin" },
    { id: 12, name: "Liam", role: "user" },
    { id: 13, name: "Mia", role: "user" },
    { id: 14, name: "Noah", role: "user" },
    { id: 15, name: "Olivia", role: "admin" },
  ],
  orders: [
    { id: 101, userId: 1, total: 150 },
    { id: 102, userId: 2, total: 75 },
    { id: 103, userId: 1, total: 200 },
    { id: 104, userId: 3, total: 50 },
    { id: 105, userId: 1, total: 175 },
    { id: 106, userId: 4, total: 300 },
    { id: 107, userId: 5, total: 125 },
    { id: 108, userId: 6, total: 80 },
    { id: 109, userId: 7, total: 450 },
    { id: 110, userId: 8, total: 60 },
    { id: 111, userId: 9, total: 95 },
    { id: 112, userId: 10, total: 210 },
    { id: 113, userId: 11, total: 180 },
    { id: 114, userId: 12, total: 55 },
    { id: 115, userId: 13, total: 320 },
    { id: 116, userId: 14, total: 40 },
    { id: 117, userId: 15, total: 275 },
    { id: 118, userId: 4, total: 150 },
    { id: 119, userId: 7, total: 200 },
    { id: 120, userId: 11, total: 90 },
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
// Shared Tool Logic (no batch endpoints - forces individual calls)
// -----------------------------------------------------------------------------

function executeGetUserIds() {
  return DB.users.map((u) => u.id);
}

function executeGetUser(id: number) {
  const user = DB.users.find((u) => u.id === id);
  if (!user) throw new Error(`User ${id} not found`);
  return user;
}

function executeGetUserOrders(userId: number) {
  // REQUIRES userId - no "get all" option
  return DB.orders.filter((o) => o.userId === userId);
}

function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case "getUserIds":
      return executeGetUserIds();
    case "getUser":
      return executeGetUser(input.id as number);
    case "getUserOrders":
      return executeGetUserOrders(input.userId as number);
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
      name: "getUserIds",
      description: "Get list of all user IDs. Returns array of numbers.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "getUser",
      description: "Get a single user by ID. REQUIRES id parameter.",
      input_schema: {
        type: "object",
        properties: { id: { type: "number", description: "User ID (required)" } },
        required: ["id"],
      },
    },
    {
      name: "getUserOrders",
      description: "Get orders for a specific user. REQUIRES userId parameter. No way to get all orders at once.",
      input_schema: {
        type: "object",
        properties: { userId: { type: "number", description: "User ID (required)" } },
        required: ["userId"],
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
      name: "getUserIds",
      description: "Get list of all user IDs. Returns array of numbers.",
      input_schema: {
        type: "object" as const,
        properties: {},
      },
      allowed_callers: ["code_execution_20250825"],
    } as Anthropic.Beta.BetaTool,
    {
      name: "getUser",
      description: "Get a single user by ID. REQUIRES id parameter. Returns {id, name, role}.",
      input_schema: {
        type: "object" as const,
        properties: { id: { type: "number", description: "User ID (required)" } },
        required: ["id"],
      },
      allowed_callers: ["code_execution_20250825"],
    } as Anthropic.Beta.BetaTool,
    {
      name: "getUserOrders",
      description: "Get orders for a specific user. REQUIRES userId. No batch endpoint. Returns [{id, userId, total}].",
      input_schema: {
        type: "object" as const,
        properties: { userId: { type: "number", description: "User ID (required)" } },
        required: ["userId"],
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
      name: "getUserIds",
      description: "Get list of all user IDs. Returns array of numbers.",
      parameters: z.object({}),
      execute: async () => {
        toolCalls++;
        return executeGetUserIds();
      },
    }),
    defineTool({
      name: "getUser",
      description: "Get a single user by ID. REQUIRES id parameter.",
      parameters: z.object({ id: z.number().describe("User ID (required)") }),
      execute: async ({ id }) => {
        toolCalls++;
        return executeGetUser(id);
      },
    }),
    defineTool({
      name: "getUserOrders",
      description: "Get orders for a specific user. REQUIRES userId. No batch endpoint.",
      parameters: z.object({ userId: z.number().describe("User ID (required)") }),
      execute: async ({ userId }) => {
        toolCalls++;
        return executeGetUserOrders(userId);
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
  const sandbox = await Sandbox.create("supertools-bun-014", { timeoutMs: 5 * 60 * 1000 });
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
