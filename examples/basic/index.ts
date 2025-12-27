/**
 * Supertools - Basic Example
 *
 * Traditional tool calling: 1 API call per tool = slow & expensive
 * Supertools: 1 API call generates code that calls ALL tools = 10x faster, 90% cheaper
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY - Your Anthropic API key
 *   E2B_API_KEY - Your E2B API key
 *
 * Run: bun run examples/basic/index.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "e2b";

import {
  supertools,
  defineTool,
  z,
  type ExecutionEvent,
  SANDBOX_TEMPLATE,
} from "@supertools-ai/core";

// See schemas.ts for schema definitions and types
import { Order, OrderSchema, StatsSchema, User, UserSchema } from "./schemas";


// =============================================================================
// Sample data - typed from schemas
// =============================================================================

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
  { id: 3, name: "Charlie", email: "charlie@example.com", role: "user" },
];

const orders: Order[] = [
  { id: 101, userId: 1, total: 150.0, status: "completed" },
  { id: 102, userId: 2, total: 75.5, status: "pending" },
  { id: 103, userId: 1, total: 200.0, status: "completed" },
  { id: 104, userId: 3, total: 50.0, status: "shipped" },
];

// =============================================================================
// Define tools - Zod schemas for params AND return types
// =============================================================================

const getUsers = defineTool({
  name: "getUsers",
  description: "Get all users or filter by role",
  parameters: z.object({
    role: z.enum(["admin", "user"]).optional().describe("Filter by role"),
  }),
  returns: z.array(UserSchema),
  execute: async ({ role }) =>
    role ? users.filter((u) => u.role === role) : users,
});

const getOrders = defineTool({
  name: "getOrders",
  description: "Get orders, optionally filtered by user or status",
  parameters: z.object({
    userId: z.number().optional().describe("Filter by user ID"),
    status: z
      .enum(["pending", "completed", "shipped"])
      .optional()
      .describe("Filter by status"),
  }),
  returns: z.array(OrderSchema),
  execute: async ({ userId, status }) => {
    let result = orders;
    if (userId) result = result.filter((o) => o.userId === userId);
    if (status) result = result.filter((o) => o.status === status);
    return result;
  },
});

const calculateStats = defineTool({
  name: "calculateStats",
  description: "Calculate statistics for an array of numbers",
  parameters: z.object({
    values: z.array(z.number()).describe("Numbers to analyze"),
  }),
  returns: StatsSchema,
  // LOCAL: runs directly in sandbox, no network round-trip! Use for pure computation and code that doesn't need host resources ie. DB, API, variables etc.
  // in this case we already have all the values provided from the previous tool calls so no need to call back to host - just compute and return
  local: true,
  execute: async ({ values }) => {
    if (!values.length)
      return { mean: 0, min: 0, max: 0, count: 0, sum: 0, median: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mid = Math.floor(sorted.length / 2);

    return {
      mean: Math.round((sum / values.length) * 100) / 100,
      median:
        sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      sum: Math.round(sum * 100) / 100,
      count: values.length,
    };
  },
});

// =============================================================================
// Use supertools - wrap client, make request, done
// =============================================================================

async function main() {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    throw new Error('E2B_API_KEY environment variable is required');
  }

  // Create sandbox upfront - you manage the lifecycle
  // Use the default SANDBOX_TEMPLATE or custom template - see DOCS on building custom templates for Supertools (should not be needed for most use cases)
  const sandbox = await Sandbox.create(SANDBOX_TEMPLATE, {
    apiKey,
    timeoutMs: 2 * 60 * 1000,
  });

  try {
    // Wrap the Anthropic client with sandbox
    const client = supertools(new Anthropic(), {
      tools: [getUsers, getOrders, calculateStats],
      sandbox,
      debug: false,
      onEvent: handleEvent,
    });

    // Use exactly like the normal Anthropic SDK
    // Behind the scenes: 1 API call → generates code → runs in sandbox → calls all tools
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `
            Analyze completed orders:
            1. Get all completed orders
            2. Calculate statistics on totals
            3. Find top spender
            4. Return summary in JSON with totalOrders, totalRevenue, averageOrder, and topSpender details
          `,
        },
      ],
    });

    // Access execution metadata - ie. generated code, execution time
    /*
    const metadata = (response as unknown as { _supertools?: { code: string; executionTimeMs: number } })._supertools;
    if (metadata) {
      console.log('\n' + '─'.repeat(60));
      console.log('Generated Code:\n');
      console.log(metadata.code);
      console.log(`\nExecution time: ${metadata.executionTimeMs}ms`);
    }
    */
  } finally {
    // Always kill sandbox to stop billing and clean up resources
    await sandbox.kill();
  }
}

main()
  .catch((error) => {
    console.error("Error:", error.message);
    if (error.cause) console.error("Cause:", error.cause);
    process.exit(1);
  });

// =============================================================================
// Event handler - log tool calls and final result
// =============================================================================

const handleEvent = (event: ExecutionEvent) => {
  switch (event.type) {
    case "tool_call":
      console.log(`  → Calling ${event.tool}...`);
      break;
    case "tool_result":
      console.log(`  ✓ ${event.tool} completed (${event.durationMs}ms) with result: ${JSON.stringify(event.result, null, 2).replace(/\n/g, "").replace(/\s+/g, " ")}`);
      break;
    case "result":
      console.log("\n📊 Result:");
      console.log(JSON.stringify(event.data, null, 2));
      break;
  }
};
