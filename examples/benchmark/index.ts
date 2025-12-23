/**
 * Supertools Benchmark
 *
 * Compares three approaches:
 * 1. Native Anthropic tool calling (multiple LLM round-trips)
 * 2. Anthropic Beta Code Execution (their built-in sandbox)
 * 3. Supertools (E2B sandbox)
 *
 * Run: bun run examples/benchmark/index.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";
import { supertools, defineTool, z } from "@supertools-ai/core";

// =============================================================================
// Simulated Database (shared by both approaches)
// =============================================================================

const users = [
  { id: 1, name: "Alice", role: "admin" },
  { id: 2, name: "Bob", role: "user" },
  { id: 3, name: "Charlie", role: "user" },
];

const orders = [
  { id: 101, userId: 1, total: 150 },
  { id: 102, userId: 2, total: 75 },
  { id: 103, userId: 1, total: 200 },
  { id: 104, userId: 3, total: 50 },
  { id: 105, userId: 1, total: 175 },
];

// =============================================================================
// Native Anthropic Tool Calling
// =============================================================================

async function runNative(client: Anthropic, prompt: string) {
  const metrics = { llmCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0 };
  const startTime = Date.now();

  // Tool definitions for Anthropic
  const tools: Anthropic.Tool[] = [
    {
      name: "getUsers",
      description: "Get users, optionally filtered by role",
      input_schema: {
        type: "object",
        properties: {
          role: { type: "string", enum: ["admin", "user"] },
        },
      },
    },
    {
      name: "getOrders",
      description: "Get orders, optionally filtered by userId",
      input_schema: {
        type: "object",
        properties: {
          userId: { type: "number" },
        },
      },
    },
  ];

  // Execute a tool locally
  function executeTool(name: string, args: Record<string, unknown>): unknown {
    metrics.toolCalls++;
    if (name === "getUsers") {
      const role = args.role as string | undefined;
      return role ? users.filter((u) => u.role === role) : users;
    }
    if (name === "getOrders") {
      const userId = args.userId as number | undefined;
      return userId ? orders.filter((o) => o.userId === userId) : orders;
    }
    throw new Error(`Unknown tool: ${name}`);
  }

  // Standard agentic loop
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  while (true) {
    metrics.llmCalls++;
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      tools,
      messages,
    });

    metrics.inputTokens += response.usage.input_tokens;
    metrics.outputTokens += response.usage.output_tokens;

    // If done, return result
    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return { result: text, metrics, timeMs: Date.now() - startTime };
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      throw new Error("Unexpected: no tool_use blocks and not end_turn");
    }

    // Add assistant message with tool calls
    messages.push({ role: "assistant", content: response.content });

    // Execute tools and add results
    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(executeTool(block.name, block.input as Record<string, unknown>)),
    }));

    messages.push({ role: "user", content: toolResults });
  }
}

// =============================================================================
// Anthropic Beta Code Execution (their built-in sandbox)
// =============================================================================

async function runAnthropicBeta(client: Anthropic, prompt: string) {
  const metrics = { llmCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0 };
  const startTime = Date.now();

  // Tool definitions with allowed_callers for code execution
  // Using the advanced-tool-use beta which enables code_execution to call tools directly
  const tools: Anthropic.Beta.BetaTool[] = [
    {
      type: "code_execution_20250825",
      name: "code_execution",
    } as unknown as Anthropic.Beta.BetaTool,
    {
      name: "getUsers",
      description: "Get users, optionally filtered by role. Returns array of {id, name, role}.",
      input_schema: {
        type: "object" as const,
        properties: {
          role: { type: "string", enum: ["admin", "user"] },
        },
      },
      // Allow code_execution to call this tool directly
      allowed_callers: ["code_execution_20250825"],
    } as unknown as Anthropic.Beta.BetaTool,
    {
      name: "getOrders",
      description: "Get orders, optionally filtered by userId. Returns array of {id, userId, total}.",
      input_schema: {
        type: "object" as const,
        properties: {
          userId: { type: "number" },
        },
      },
      // Allow code_execution to call this tool directly
      allowed_callers: ["code_execution_20250825"],
    } as unknown as Anthropic.Beta.BetaTool,
  ];

  // Execute a tool locally
  function executeTool(name: string, args: Record<string, unknown>): unknown {
    metrics.toolCalls++;
    if (name === "getUsers") {
      const role = args.role as string | undefined;
      return role ? users.filter((u) => u.role === role) : users;
    }
    if (name === "getOrders") {
      const userId = args.userId as number | undefined;
      return userId ? orders.filter((o) => o.userId === userId) : orders;
    }
    throw new Error(`Unknown tool: ${name}`);
  }

  // Agentic loop for beta API with container tracking
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  let container: string | undefined;

  while (true) {
    metrics.llmCalls++;

    // Build request params, include container if we have one
    const requestParams: Record<string, unknown> = {
      model: "claude-sonnet-4-5-20250929",
      betas: ["advanced-tool-use-2025-11-20"],
      max_tokens: 8096,
      tools,
      messages,
    };

    if (container) {
      requestParams.container = container;
    }

    const response = await client.beta.messages.create(requestParams as unknown as Anthropic.Beta.MessageCreateParams) as Anthropic.Beta.BetaMessage;

    metrics.inputTokens += response.usage.input_tokens;
    metrics.outputTokens += response.usage.output_tokens;

    // Extract container id from response if present
    const responseAny = response as unknown as { container?: { id: string } };
    if (responseAny.container?.id) {
      container = responseAny.container.id;
    }

    // If done, return result
    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return { result: text, metrics, timeMs: Date.now() - startTime };
    }

    // Check for tool use blocks (regular tools called by code execution)
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0 && response.stop_reason !== "tool_use") {
      // No tool calls and not waiting for tools - might be done
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return { result: text, metrics, timeMs: Date.now() - startTime };
    }

    // Add assistant message
    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlock[] });

    // Execute tools and add results
    if (toolUseBlocks.length > 0) {
      const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = toolUseBlocks.map((block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input as Record<string, unknown>)),
      }));
      messages.push({ role: "user", content: toolResults });
    }
  }
}

// =============================================================================
// Programmatic Execution (Supertools)
// =============================================================================

async function runProgrammatic(client: Anthropic, sandbox: Sandbox, prompt: string) {
  const metrics = { llmCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0 };
  const startTime = Date.now();

  // Wrap client to intercept and track token usage
  const trackedClient = {
    messages: {
      create: async (params: Anthropic.MessageCreateParams) => {
        metrics.llmCalls++;
        const response = await client.messages.create(params) as Anthropic.Message;
        metrics.inputTokens += response.usage.input_tokens;
        metrics.outputTokens += response.usage.output_tokens;
        return response;
      },
    },
  } as Anthropic;

  // Tool definitions for supertools
  const tools = [
    defineTool({
      name: "getUsers",
      description: "Get users, optionally filtered by role",
      parameters: z.object({
        role: z.enum(["admin", "user"]).optional(),
      }),
      execute: async ({ role }) => {
        metrics.toolCalls++;
        return role ? users.filter((u) => u.role === role) : users;
      },
    }),
    defineTool({
      name: "getOrders",
      description: "Get orders, optionally filtered by userId",
      parameters: z.object({
        userId: z.number().optional(),
      }),
      execute: async ({ userId }) => {
        metrics.toolCalls++;
        return userId ? orders.filter((o) => o.userId === userId) : orders;
      },
    }),
  ];

  const wrappedClient = supertools(trackedClient, { tools, sandbox });

  const response = await wrappedClient.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return { result: text, metrics, timeMs: Date.now() - startTime };
}

// =============================================================================
// Benchmark Runner
// =============================================================================

interface MetricsResult {
  timeMs: number;
  llmCalls: number;
  toolCalls: number;
  tokens: number;
}

interface BenchmarkResult {
  name: string;
  prompt: string;
  native: MetricsResult;
  anthropicBeta: MetricsResult;
  supertools: MetricsResult;
}

async function runBenchmark(
  client: Anthropic,
  sandbox: Sandbox,
  name: string,
  prompt: string
): Promise<BenchmarkResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Benchmark: ${name}`);
  console.log(`Prompt: "${prompt}"`);
  console.log("=".repeat(70));

  // Run native
  console.log("\n[Native] Running...");
  const native = await runNative(client, prompt);
  console.log(`[Native] Done in ${native.timeMs}ms`);
  console.log(`[Native] LLM calls: ${native.metrics.llmCalls}, Tool calls: ${native.metrics.toolCalls}`);
  console.log(`[Native] Tokens: ${native.metrics.inputTokens + native.metrics.outputTokens}`);

  // Run Anthropic Beta Code Execution
  console.log("\n[Anthropic Beta] Running...");
  const anthropicBeta = await runAnthropicBeta(client, prompt);
  console.log(`[Anthropic Beta] Done in ${anthropicBeta.timeMs}ms`);
  console.log(`[Anthropic Beta] LLM calls: ${anthropicBeta.metrics.llmCalls}, Tool calls: ${anthropicBeta.metrics.toolCalls}`);
  console.log(`[Anthropic Beta] Tokens: ${anthropicBeta.metrics.inputTokens + anthropicBeta.metrics.outputTokens}`);

  // Run Supertools
  console.log("\n[Supertools] Running...");
  const supertoolsResult = await runProgrammatic(client, sandbox, prompt);
  console.log(`[Supertools] Done in ${supertoolsResult.timeMs}ms`);
  console.log(`[Supertools] LLM calls: ${supertoolsResult.metrics.llmCalls}, Tool calls: ${supertoolsResult.metrics.toolCalls}`);
  console.log(`[Supertools] Tokens: ${supertoolsResult.metrics.inputTokens + supertoolsResult.metrics.outputTokens}`);

  return {
    name,
    prompt,
    native: {
      timeMs: native.timeMs,
      llmCalls: native.metrics.llmCalls,
      toolCalls: native.metrics.toolCalls,
      tokens: native.metrics.inputTokens + native.metrics.outputTokens,
    },
    anthropicBeta: {
      timeMs: anthropicBeta.timeMs,
      llmCalls: anthropicBeta.metrics.llmCalls,
      toolCalls: anthropicBeta.metrics.toolCalls,
      tokens: anthropicBeta.metrics.inputTokens + anthropicBeta.metrics.outputTokens,
    },
    supertools: {
      timeMs: supertoolsResult.timeMs,
      llmCalls: supertoolsResult.metrics.llmCalls,
      toolCalls: supertoolsResult.metrics.toolCalls,
      tokens: supertoolsResult.metrics.inputTokens + supertoolsResult.metrics.outputTokens,
    },
  };
}

async function main() {
  const client = new Anthropic();

  console.log("Creating E2B sandbox...");
  const sandbox = await Sandbox.create("supertools-bun", { timeoutMs: 5 * 60 * 1000 });
  console.log("Sandbox ready\n");

  try {
    const benchmarks = [
      {
        name: "Simple (1 tool)",
        prompt: "Get all admin users",
      },
      {
        name: "Parallel (2 tools)",
        prompt: "Get all users and all orders",
      },
      {
        name: "Sequential (dependent)",
        prompt: "Get admin users, then get orders for each admin",
      },
      {
        name: "Complex (logic + aggregation)",
        prompt: "Get all users, find admins, get their orders, and calculate total revenue per admin",
      },
    ];

    const results: BenchmarkResult[] = [];

    for (const bench of benchmarks) {
      const result = await runBenchmark(client, sandbox, bench.name, bench.prompt);
      results.push(result);
    }

    // Summary
    console.log("\n" + "=".repeat(100));
    console.log("SUMMARY");
    console.log("=".repeat(100));

    // Helper to format metrics
    const fmt = (m: MetricsResult) =>
      `${String(m.timeMs).padStart(5)}ms ${String(m.llmCalls).padStart(1)}c ${String(m.tokens).padStart(5)}tok`;

    // Detailed table
    console.log("\n| Benchmark              | Native             | Anthropic Beta     | Supertools         |");
    console.log("|------------------------|--------------------|--------------------|---------------------|");

    for (const r of results) {
      console.log(
        `| ${r.name.padEnd(22)} | ${fmt(r.native)} | ${fmt(r.anthropicBeta)} | ${fmt(r.supertools)} |`
      );
    }

    // Totals
    const totals = results.reduce(
      (acc, r) => ({
        native: {
          timeMs: acc.native.timeMs + r.native.timeMs,
          llmCalls: acc.native.llmCalls + r.native.llmCalls,
          toolCalls: acc.native.toolCalls + r.native.toolCalls,
          tokens: acc.native.tokens + r.native.tokens,
        },
        anthropicBeta: {
          timeMs: acc.anthropicBeta.timeMs + r.anthropicBeta.timeMs,
          llmCalls: acc.anthropicBeta.llmCalls + r.anthropicBeta.llmCalls,
          toolCalls: acc.anthropicBeta.toolCalls + r.anthropicBeta.toolCalls,
          tokens: acc.anthropicBeta.tokens + r.anthropicBeta.tokens,
        },
        supertools: {
          timeMs: acc.supertools.timeMs + r.supertools.timeMs,
          llmCalls: acc.supertools.llmCalls + r.supertools.llmCalls,
          toolCalls: acc.supertools.toolCalls + r.supertools.toolCalls,
          tokens: acc.supertools.tokens + r.supertools.tokens,
        },
      }),
      {
        native: { timeMs: 0, llmCalls: 0, toolCalls: 0, tokens: 0 },
        anthropicBeta: { timeMs: 0, llmCalls: 0, toolCalls: 0, tokens: 0 },
        supertools: { timeMs: 0, llmCalls: 0, toolCalls: 0, tokens: 0 }
      }
    );

    console.log("|------------------------|--------------------|--------------------|---------------------|");
    console.log(
      `| ${"TOTAL".padEnd(22)} | ${fmt(totals.native)} | ${fmt(totals.anthropicBeta)} | ${fmt(totals.supertools)} |`
    );

    // Comparison
    console.log("\n" + "=".repeat(100));
    console.log("COMPARISON (vs Native)");
    console.log("=".repeat(100));

    const betaSpeedup = (totals.native.timeMs / totals.anthropicBeta.timeMs).toFixed(1);
    const betaTokenDiff = (((totals.native.tokens - totals.anthropicBeta.tokens) / totals.native.tokens) * 100).toFixed(0);
    const betaCallReduction = (((totals.native.llmCalls - totals.anthropicBeta.llmCalls) / totals.native.llmCalls) * 100).toFixed(0);

    const stSpeedup = (totals.native.timeMs / totals.supertools.timeMs).toFixed(1);
    const stTokenSavings = (((totals.native.tokens - totals.supertools.tokens) / totals.native.tokens) * 100).toFixed(0);
    const stCallReduction = (((totals.native.llmCalls - totals.supertools.llmCalls) / totals.native.llmCalls) * 100).toFixed(0);

    console.log("\nAnthropic Beta (code_execution):");
    console.log(`  Time:      ${betaSpeedup}x ${Number(betaSpeedup) >= 1 ? "faster" : "slower"}`);
    console.log(`  Tokens:    ${Math.abs(Number(betaTokenDiff))}% ${Number(betaTokenDiff) >= 0 ? "fewer" : "more"}`);
    console.log(`  LLM Calls: ${Math.abs(Number(betaCallReduction))}% ${Number(betaCallReduction) >= 0 ? "fewer" : "more"}`);

    console.log("\nSupertools (E2B sandbox):");
    console.log(`  Time:      ${stSpeedup}x ${Number(stSpeedup) >= 1 ? "faster" : "slower"}`);
    console.log(`  Tokens:    ${Math.abs(Number(stTokenSavings))}% ${Number(stTokenSavings) >= 0 ? "fewer" : "more"}`);
    console.log(`  LLM Calls: ${Math.abs(Number(stCallReduction))}% ${Number(stCallReduction) >= 0 ? "fewer" : "more"}`);

    // Supertools vs Anthropic Beta
    console.log("\n" + "=".repeat(100));
    console.log("SUPERTOOLS vs ANTHROPIC BETA");
    console.log("=".repeat(100));

    const stVsBetaSpeed = (totals.anthropicBeta.timeMs / totals.supertools.timeMs).toFixed(1);
    const stVsBetaTokens = (((totals.anthropicBeta.tokens - totals.supertools.tokens) / totals.anthropicBeta.tokens) * 100).toFixed(0);

    console.log(`\nTime:   Supertools is ${stVsBetaSpeed}x ${Number(stVsBetaSpeed) >= 1 ? "faster" : "slower"} than Anthropic Beta`);
    console.log(`Tokens: Supertools uses ${Math.abs(Number(stVsBetaTokens))}% ${Number(stVsBetaTokens) >= 0 ? "fewer" : "more"} tokens`);

    console.log("\nTrade-offs:");
    console.log("- Native:         Natural language response, multiple round-trips");
    console.log("- Anthropic Beta: Built-in sandbox (Python), no setup needed, higher token usage");
    console.log("- Supertools:     External sandbox (E2B/Bun), requires setup, lowest tokens, raw JSON output");
  } finally {
    await sandbox.kill();
  }
}

main().catch(console.error);
