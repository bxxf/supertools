/**
 * Supertools - Interactive Chat Demo
 *
 * IMPORTANT: This example demonstrates programmatic tool execution, but a chat
 * interface is NOT the ideal use case for supertools. Here's why:
 *
 * WHAT SUPERTOOLS DOES:
 * - Generates code that calls your tools in a secure sandbox
 * - Returns raw data (JSON) - the LLM never sees the results
 * - Optimized for complex workflows with loops, conditionals, and multiple tools
 *
 * WHEN SUPERTOOLS SHINES:
 * - Batch operations: "Process all 100 orders and calculate stats"
 * - Complex logic: "For each admin user, get their orders and sum totals"
 * - Multi-tool workflows: "Query DB, filter results, send emails to matches"
 *
 * WHEN TO USE TRADITIONAL TOOL CALLING INSTEAD:
 * - Chatbots where natural language responses matter
 * - Simple 1-2 tool queries where LLM should interpret results
 * - Conversational UX where the LLM needs to see tool outputs
 *
 * This demo shows the raw behavior - responses are JSON, not natural language.
 * For a production chatbot, consider using the Anthropic SDK directly with
 * standard tool calling, or add a summarization step after execution.
 *
 * Run: bun run examples/chat/index.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { supertools } from "@supertools-ai/core";

import { tools } from "./tools";
import { SandboxPool } from "./sandbox-pool";

// =============================================================================
// Chat loop
// =============================================================================

async function chat(
  pool: SandboxPool,
  messages: Anthropic.MessageParam[],
  input: string
) {
  messages.push({ role: "user", content: input });

  const sandbox = await pool.acquire();

  try {
    let executionResult: unknown = null;

    const client = supertools(new Anthropic(), {
      tools,
      sandbox,
      debug: false,
      onEvent: (e) => {
        if (e.type === "tool_call") console.log(`  -> ${e.tool}()`);
        if (e.type === "result") {
          executionResult = e.data;
        }
      },
    });

    console.log("\nAssistant: thinking...\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system:
        "You have access to a user/order database. Use the tools to answer questions. Be concise.",
      messages,
    });

    // NOTE: With programmatic execution, the LLM generates code but never sees
    // the execution results. That's why we show the raw JSON result here.
    // For natural language responses, you'd need to either:
    // 1. Use traditional tool calling (LLM sees tool results)
    // 2. Add a summarization step (extra LLM call to format results)
    if (executionResult) {
      console.log(`Assistant:\n${JSON.stringify(executionResult, null, 2)}\n`);
      messages.push({
        role: "assistant",
        content: JSON.stringify(executionResult),
      });
    } else {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      console.log(`Assistant: ${text}\n`);
      messages.push({ role: "assistant", content: text });
    }
  } finally {
    await pool.release(sandbox);
  }
}

async function main() {
  const pool = new SandboxPool(3);
  const messages: Anthropic.MessageParam[] = [];

  console.log("\n" + "=".repeat(60));
  console.log("Supertools Chat Demo");
  console.log("=".repeat(60));
  console.log("\nNOTE: Responses are raw JSON (see comments in source for why)");
  console.log("\nData: users (Alice, Bob, Charlie) + orders");
  console.log("Try: 'Get all orders' or 'Total revenue?' or 'Who spent the most?'");
  console.log("Ctrl+C to exit\n");

  try {
    while (true) {
      const input = prompt("You: ");

      if (input === null || input.toLowerCase() === "exit") {
        break;
      }

      if (!input.trim()) continue;

      try {
        await chat(pool, messages, input);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }
    }
  } finally {
    await pool.shutdown();
  }
}

main().catch(console.error);
