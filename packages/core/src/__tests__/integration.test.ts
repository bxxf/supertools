/**
 * Integration Tests
 *
 * These tests require real API keys and run against actual services.
 * They are skipped if E2B_API_KEY or ANTHROPIC_API_KEY are not set.
 *
 * Run with: E2B_API_KEY=... ANTHROPIC_API_KEY=... bun test integration
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { defineTool, SANDBOX_TEMPLATE, supertools, z } from "../index";

// Check if we have the required API keys
const hasE2bKey = !!process.env.E2B_API_KEY;
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
const canRunIntegration = hasE2bKey && hasAnthropicKey;

// Dynamic imports to avoid errors when keys are missing
let Anthropic: any;
let Sandbox: any;

if (canRunIntegration) {
  try {
    Anthropic = (await import("@anthropic-ai/sdk")).default;
    Sandbox = (await import("e2b")).Sandbox;
  } catch (_e) {
    // Dependencies not installed
  }
}

describe.skipIf(!canRunIntegration)("Integration Tests", () => {
  let sandbox: any;

  beforeAll(async () => {
    if (!canRunIntegration) return;

    console.log("Creating E2B sandbox...");
    sandbox = await Sandbox.create(SANDBOX_TEMPLATE, {
      timeoutMs: 5 * 60 * 1000, // 5 minutes
    });
    console.log(`Sandbox created: ${sandbox.sandboxId}`);
  }, 60_000); // 60s timeout for sandbox creation

  afterAll(async () => {
    if (sandbox) {
      console.log("Killing sandbox...");
      await sandbox.kill();
      console.log("Sandbox killed");
    }
  });

  it("executes a simple tool call", async () => {
    const events: any[] = [];

    // Define a simple calculation tool
    const tools = [
      defineTool({
        name: "add",
        description: "Add two numbers together",
        parameters: z.object({
          a: z.number().describe("First number"),
          b: z.number().describe("Second number"),
        }),
        returns: z.number(),
        execute: async ({ a, b }) => a + b,
      }),
    ];

    const anthropic = new Anthropic();
    const client = supertools(anthropic, {
      tools,
      sandbox,
      debug: true,
      onEvent: (event) => events.push(event),
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "What is 5 + 3? Use the add tool.",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);

    // Check that execution metadata is attached
    const metadata = (response as any)._supertools;
    expect(metadata).toBeDefined();
    expect(metadata.code).toBeDefined();

    // Verify code_generated event - LLM should generate code with mcp.call
    const codeGenEvent = events.find((e) => e.type === "code_generated");
    expect(codeGenEvent).toBeDefined();
    expect(codeGenEvent.code).toContain("mcp.call");

    // Verify tool was called (LLM decides exact args, we just verify tool was used)
    const toolCallEvents = events.filter((e) => e.type === "tool_call");
    expect(toolCallEvents.length).toBeGreaterThanOrEqual(1);

    const addCall = toolCallEvents.find((e) => e.tool === "add");
    expect(addCall).toBeDefined();
    expect(typeof addCall.arguments.a).toBe("number");
    expect(typeof addCall.arguments.b).toBe("number");

    // Verify tool returned a result
    const toolResultEvents = events.filter((e) => e.type === "tool_result");
    expect(toolResultEvents.length).toBeGreaterThanOrEqual(1);

    const addResult = toolResultEvents.find((e) => e.tool === "add");
    expect(addResult).toBeDefined();
    expect(typeof addResult.result).toBe("number");
    expect(addResult.durationMs).toBeGreaterThanOrEqual(0);

    // Verify complete event
    const completeEvent = events.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent.success).toBe(true);
  }, 60_000);

  it("executes multiple tool calls", async () => {
    const events: any[] = [];

    const tools = [
      defineTool({
        name: "multiply",
        description: "Multiply two numbers",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
        }),
        execute: async ({ a, b }) => a * b,
      }),
      defineTool({
        name: "subtract",
        description: "Subtract b from a",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
        }),
        execute: async ({ a, b }) => a - b,
      }),
    ];

    const anthropic = new Anthropic();
    const client = supertools(anthropic, {
      tools,
      sandbox,
      debug: true,
      onEvent: (event) => events.push(event),
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "Calculate (10 * 5) - 8. Use multiply first, then subtract.",
        },
      ],
    });

    expect(response).toBeDefined();

    // Get all tool call events
    const toolCallEvents = events.filter((e) => e.type === "tool_call");
    const toolResultEvents = events.filter((e) => e.type === "tool_result");

    // Should have at least 2 tool calls (LLM should use both tools)
    expect(toolCallEvents.length).toBeGreaterThanOrEqual(2);
    expect(toolResultEvents.length).toBeGreaterThanOrEqual(2);

    // Verify both tools were called
    const multiplyCall = toolCallEvents.find((e) => e.tool === "multiply");
    const subtractCall = toolCallEvents.find((e) => e.tool === "subtract");
    expect(multiplyCall).toBeDefined();
    expect(subtractCall).toBeDefined();

    // Verify arguments are numbers (not checking exact values - LLM decides)
    expect(typeof multiplyCall.arguments.a).toBe("number");
    expect(typeof multiplyCall.arguments.b).toBe("number");
    expect(typeof subtractCall.arguments.a).toBe("number");
    expect(typeof subtractCall.arguments.b).toBe("number");

    // Verify results are numbers
    const multiplyResult = toolResultEvents.find((e) => e.tool === "multiply");
    const subtractResult = toolResultEvents.find((e) => e.tool === "subtract");
    expect(typeof multiplyResult.result).toBe("number");
    expect(typeof subtractResult.result).toBe("number");

    // Verify code references both tools
    const codeGenEvent = events.find((e) => e.type === "code_generated");
    expect(codeGenEvent.code).toContain("multiply");
    expect(codeGenEvent.code).toContain("subtract");
  }, 60_000);

  it("handles local tools (sandbox execution)", async () => {
    const events: any[] = [];

    const tools = [
      defineTool({
        name: "sumArray",
        description: "Sum all numbers in an array",
        parameters: z.object({
          numbers: z.array(z.number()),
        }),
        local: true, // Runs in sandbox, no network round-trip
        execute: async ({ numbers }) => numbers.reduce((a, b) => a + b, 0),
      }),
    ];

    const anthropic = new Anthropic();
    const client = supertools(anthropic, {
      tools,
      sandbox,
      debug: true,
      onEvent: (event) => events.push(event),
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "Sum the numbers [1, 2, 3, 4, 5] using sumArray.",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();

    // Verify code was generated with local tool call
    const codeGenEvent = events.find((e) => e.type === "code_generated");
    expect(codeGenEvent).toBeDefined();
    // Local tools use 'local.' prefix in mcp.call
    expect(codeGenEvent.code).toMatch(/local\.\w+/);

    // Local tools run in sandbox, so no tool_call events come back to host
    // Verify we got a result event
    const resultEvent = events.find((e) => e.type === "result");
    expect(resultEvent).toBeDefined();
    // Result should be a number (the sum)
    expect(typeof resultEvent.data).toBe("number");
  }, 60_000);

  it("handles tool errors gracefully", async () => {
    const events: any[] = [];

    const tools = [
      defineTool({
        name: "failingTool",
        description: "A tool that always fails",
        parameters: z.object({}),
        execute: async () => {
          throw new Error("Intentional failure");
        },
      }),
    ];

    const anthropic = new Anthropic();
    const client = supertools(anthropic, {
      tools,
      sandbox,
      debug: true,
      onEvent: (event) => events.push(event),
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "Call the failingTool.",
        },
      ],
    });

    // Should still return a response, even if the tool failed
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();

    // Verify tool_call was made
    const toolCallEvent = events.find((e) => e.type === "tool_call");
    expect(toolCallEvent).toBeDefined();
    expect(toolCallEvent.tool).toBe("failing_tool");

    // Verify tool_error was emitted
    const toolErrorEvent = events.find((e) => e.type === "tool_error");
    expect(toolErrorEvent).toBeDefined();
    expect(toolErrorEvent.tool).toBe("failing_tool");
    expect(toolErrorEvent.error).toBe("Intentional failure");
  }, 60_000);

  it("verifies complete event flow from code generation to result", async () => {
    const events: any[] = [];

    const tools = [
      defineTool({
        name: "ping",
        description: "Returns pong",
        parameters: z.object({}),
        execute: async () => "pong",
      }),
    ];

    const anthropic = new Anthropic();
    const client = supertools(anthropic, {
      tools,
      sandbox,
      debug: true,
      onEvent: (event) => events.push(event),
    });

    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "Call the ping tool and return its result.",
        },
      ],
    });

    // Verify all expected events were emitted
    const eventTypes = events.map((e) => e.type);

    // 1. Code should be generated first
    expect(eventTypes).toContain("code_generated");
    const codeGenIndex = eventTypes.indexOf("code_generated");

    // 2. Sandbox should be ready
    expect(eventTypes).toContain("sandbox_ready");
    const sandboxReadyIndex = eventTypes.indexOf("sandbox_ready");

    // 3. Tool should be called
    expect(eventTypes).toContain("tool_call");
    const toolCallIndex = eventTypes.indexOf("tool_call");

    // 4. Tool result should be received
    expect(eventTypes).toContain("tool_result");
    const toolResultIndex = eventTypes.indexOf("tool_result");

    // 5. Final result
    expect(eventTypes).toContain("result");

    // 6. Complete event
    expect(eventTypes).toContain("complete");

    // Verify order: code_generated and sandbox_ready come first (parallel)
    // Then tool_call -> tool_result
    expect(toolCallIndex).toBeGreaterThan(Math.min(codeGenIndex, sandboxReadyIndex));
    expect(toolResultIndex).toBeGreaterThan(toolCallIndex);

    // Verify event details
    const codeGenEvent = events.find((e) => e.type === "code_generated");
    expect(codeGenEvent.code).toContain("mcp.call");

    const sandboxEvent = events.find((e) => e.type === "sandbox_ready");
    expect(sandboxEvent.sandboxId).toBeDefined();
    expect(typeof sandboxEvent.sandboxId).toBe("string");

    const toolCallEvent = events.find((e) => e.type === "tool_call");
    expect(toolCallEvent.tool).toBe("ping");
    expect(toolCallEvent.callId).toBeDefined();
    expect(typeof toolCallEvent.callId).toBe("string");

    const toolResultEvent = events.find((e) => e.type === "tool_result");
    expect(toolResultEvent.tool).toBe("ping");
    expect(toolResultEvent.result).toBe("pong");
    expect(typeof toolResultEvent.durationMs).toBe("number");
    expect(toolResultEvent.durationMs).toBeGreaterThanOrEqual(0);

    const resultEvent = events.find((e) => e.type === "result");
    expect(resultEvent.data).toBeDefined();

    const completeEvent = events.find((e) => e.type === "complete");
    expect(completeEvent.success).toBe(true);

    console.log("Event flow:", eventTypes.join(" -> "));
  }, 60_000);
});

// Smoke test that always runs (no API keys needed)
describe("Integration Smoke Tests", () => {
  it("SANDBOX_TEMPLATE is exported", async () => {
    expect(SANDBOX_TEMPLATE).toBeDefined();
    expect(typeof SANDBOX_TEMPLATE).toBe("string");
    expect(SANDBOX_TEMPLATE.length).toBeGreaterThan(0);
  });

  it("all main exports are available", async () => {
    const { supertools, defineTool, z, normalizeTools, isTool } = await import("../index");

    expect(supertools).toBeDefined();
    expect(defineTool).toBeDefined();
    expect(z).toBeDefined();
    expect(normalizeTools).toBeDefined();
    expect(isTool).toBeDefined();
  });
});
