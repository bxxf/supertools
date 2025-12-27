/**
 * Supertools - Interactive Chat Demo
 *
 * This example shows how to use supertools for chat with conversational responses.
 *
 * The flow:
 * 1. User sends a message
 * 2. Supertools generates code and executes tools in sandbox
 * 3. Results are captured via onEvent callback
 * 4. A second LLM call summarizes the results conversationally
 *
 * Run: bun run examples/chat/index.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { supertools } from "@supertools-ai/core";

import { tools } from "./tools";
import { SandboxPool } from "./sandbox-pool";

async function chat(
  pool: SandboxPool,
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[],
  input: string
) {
  messages.push({ role: "user", content: input });

  const sandbox = await pool.acquire();

  try {
    let executionResult: unknown = null;

    const client = supertools(anthropic, {
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

    await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system:
        "You have access to a user/order database. Use the tools to answer questions.",
      messages,
    });

    // If we got results from tool execution, summarize them with streaming
    if (executionResult) {
      process.stdout.write("Assistant: ");

      let fullText = "";
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: "You are a helpful assistant. Summarize the data concisely in natural language. Be conversational.",
        messages: [
          ...messages,
          {
            role: "assistant",
            content: `I executed the tools and got this result: ${JSON.stringify(executionResult)}`,
          },
          {
            role: "user",
            content: "Now summarize that result for me in a natural, conversational way.",
          },
        ],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          process.stdout.write(event.delta.text);
          fullText += event.delta.text;
        }
      }

      console.log("\n");
      messages.push({ role: "assistant", content: fullText });
    } else {
      console.log("Assistant: I couldn't find any relevant data for that query.\n");
      messages.push({ role: "assistant", content: "I couldn't find any relevant data for that query." });
    }
  } finally {
    await pool.release(sandbox);
  }
}

async function main() {
  const pool = new SandboxPool(3);
  const anthropic = new Anthropic();
  const messages: Anthropic.MessageParam[] = [];

  console.log("\n" + "=".repeat(60));
  console.log("Supertools Chat Demo");
  console.log("=".repeat(60));
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
        await chat(pool, anthropic, messages, input);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }
    }
  } finally {
    await pool.shutdown();
  }
}

main().catch(console.error);
