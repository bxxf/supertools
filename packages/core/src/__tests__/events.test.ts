import { describe, expect, it } from "bun:test";
import { RelayClient } from "../relay/client";
import { encode } from "../relay/proto";
import type { ExecutionEvent } from "../types";

/**
 * Creates test tools with tracked execution
 */
function createTestTools() {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  const tools = new Map([
    [
      "calculate",
      {
        name: "calculate",
        description: "Calculate sum",
        parameters: [],
        execute: async (args: Record<string, unknown>) => {
          calls.push({ name: "calculate", args });
          return { sum: (args.values as number[]).reduce((a, b) => a + b, 0) };
        },
      },
    ],
    [
      "add",
      {
        name: "add",
        description: "Add numbers",
        parameters: [],
        execute: async (args: { a: number; b: number }) => {
          calls.push({ name: "add", args });
          return args.a + args.b;
        },
      },
    ],
    [
      "multiply",
      {
        name: "multiply",
        description: "Multiply numbers",
        parameters: [],
        execute: async (args: { a: number; b: number }) => {
          calls.push({ name: "multiply", args });
          return args.a * args.b;
        },
      },
    ],
  ]);

  return { tools, calls };
}

/**
 * Helper to simulate message and wait for async processing
 */
async function simulateMessage(
  client: RelayClient,
  message: Uint8Array,
  waitMs = 10
): Promise<void> {
  (client as any).onMessage(message.buffer);
  // Use setImmediate-style wait to let async handlers complete
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

describe("ExecutionEvent contract", () => {
  describe("code_generated", () => {
    it("requires code field", () => {
      const event: ExecutionEvent = {
        type: "code_generated",
        code: "const x = 1;",
      };
      expect(event.code).toBeDefined();
      expect(typeof event.code).toBe("string");
    });

    it("explanation is optional", () => {
      const withExplanation: ExecutionEvent = {
        type: "code_generated",
        code: "return 42;",
        explanation: "Returns the answer",
      };
      const withoutExplanation: ExecutionEvent = {
        type: "code_generated",
        code: "return 42;",
      };
      expect(withExplanation.explanation).toBe("Returns the answer");
      expect(withoutExplanation.explanation).toBeUndefined();
    });
  });

  describe("tool_call", () => {
    it("has required fields: tool, arguments, callId", () => {
      const event: ExecutionEvent = {
        type: "tool_call",
        tool: "get_users",
        arguments: { limit: 10 },
        callId: "call-123",
      };
      expect(event.tool).toBe("get_users");
      expect(event.arguments).toEqual({ limit: 10 });
      expect(event.callId).toBe("call-123");
    });
  });

  describe("tool_result", () => {
    it("has required fields including durationMs", () => {
      const event: ExecutionEvent = {
        type: "tool_result",
        tool: "get_users",
        result: [{ id: 1 }],
        callId: "call-123",
        durationMs: 42,
      };
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
      expect(event.result).toEqual([{ id: 1 }]);
    });
  });

  describe("tool_error", () => {
    it("has error message", () => {
      const event: ExecutionEvent = {
        type: "tool_error",
        tool: "failing_tool",
        error: "Connection refused",
        callId: "call-456",
      };
      expect(event.error).toBe("Connection refused");
    });
  });

  describe("complete", () => {
    it("success case has no error", () => {
      const event: ExecutionEvent = {
        type: "complete",
        success: true,
        output: "Done",
      };
      expect(event.success).toBe(true);
      expect(event.error).toBeUndefined();
    });

    it("failure case has error", () => {
      const event: ExecutionEvent = {
        type: "complete",
        success: false,
        output: "",
        error: "Timeout",
      };
      expect(event.success).toBe(false);
      expect(event.error).toBe("Timeout");
    });
  });
});

describe("RelayClient event emission", () => {
  it("emits tool_call with correct data when message received", async () => {
    const events: ExecutionEvent[] = [];
    const { tools } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => events.push(e),
    });

    await simulateMessage(
      client,
      encode("tool_call", {
        id: "call-001",
        tool: "calculate",
        arguments: { values: [1, 2, 3] },
      })
    );

    const toolCallEvent = events.find((e) => e.type === "tool_call") as Extract<
      ExecutionEvent,
      { type: "tool_call" }
    >;

    expect(toolCallEvent).toBeDefined();
    expect(toolCallEvent.tool).toBe("calculate");
    expect(toolCallEvent.callId).toBe("call-001");
    expect(toolCallEvent.arguments).toEqual({ values: [1, 2, 3] });
  });

  it("emits tool_result after successful execution with timing", async () => {
    const events: ExecutionEvent[] = [];
    const { tools, calls } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => events.push(e),
    });

    await simulateMessage(
      client,
      encode("tool_call", {
        id: "call-002",
        tool: "add",
        arguments: { a: 10, b: 5 },
      }),
      50 // wait for async execute
    );

    // Verify tool was actually called
    expect(calls).toContainEqual({ name: "add", args: { a: 10, b: 5 } });

    const resultEvent = events.find((e) => e.type === "tool_result") as Extract<
      ExecutionEvent,
      { type: "tool_result" }
    >;

    expect(resultEvent).toBeDefined();
    expect(resultEvent.tool).toBe("add");
    expect(resultEvent.result).toBe(15);
    expect(resultEvent.durationMs).toBeGreaterThanOrEqual(0);
    expect(resultEvent.callId).toBe("call-002");
  });

  it("emits tool_error when tool throws", async () => {
    const events: ExecutionEvent[] = [];
    const failingTools = new Map([
      [
        "explode",
        {
          name: "explode",
          description: "Always fails",
          parameters: [],
          execute: async () => {
            throw new Error("Boom!");
          },
        },
      ],
    ]);

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools: failingTools,
      onEvent: (e) => events.push(e),
    });

    await simulateMessage(
      client,
      encode("tool_call", { id: "call-fail", tool: "explode", arguments: {} }),
      50
    );

    const errorEvent = events.find((e) => e.type === "tool_error") as Extract<
      ExecutionEvent,
      { type: "tool_error" }
    >;

    expect(errorEvent).toBeDefined();
    expect(errorEvent.tool).toBe("explode");
    expect(errorEvent.error).toBe("Boom!");
    expect(errorEvent.callId).toBe("call-fail");
  });

  it("emits tool_error for unknown tool", async () => {
    const events: ExecutionEvent[] = [];
    const { tools } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => events.push(e),
    });

    await simulateMessage(
      client,
      encode("tool_call", { id: "call-unknown", tool: "nonexistent", arguments: {} })
    );

    const errorEvent = events.find((e) => e.type === "tool_error") as Extract<
      ExecutionEvent,
      { type: "tool_error" }
    >;

    expect(errorEvent).toBeDefined();
    expect(errorEvent.error).toBe("Unknown tool");
  });

  it("emits result event for final result message", async () => {
    const events: ExecutionEvent[] = [];
    const { tools } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => events.push(e),
    });

    await simulateMessage(client, encode("result", { data: { answer: 42 } }));

    const resultEvent = events.find((e) => e.type === "result") as Extract<
      ExecutionEvent,
      { type: "result" }
    >;

    expect(resultEvent).toBeDefined();
    expect(resultEvent.data).toEqual({ answer: 42 });
  });

  it("handles sequential tool calls maintaining correct order", async () => {
    const events: ExecutionEvent[] = [];
    const { tools, calls } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => events.push(e),
    });

    // First call
    await simulateMessage(
      client,
      encode("tool_call", { id: "seq-1", tool: "add", arguments: { a: 1, b: 2 } }),
      50
    );

    // Second call
    await simulateMessage(
      client,
      encode("tool_call", { id: "seq-2", tool: "multiply", arguments: { a: 3, b: 4 } }),
      50
    );

    // Verify both tools were called
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ name: "add", args: { a: 1, b: 2 } });
    expect(calls[1]).toEqual({ name: "multiply", args: { a: 3, b: 4 } });

    // Verify events
    const toolCalls = events.filter((e) => e.type === "tool_call");
    const toolResults = events.filter((e) => e.type === "tool_result");

    expect(toolCalls).toHaveLength(2);
    expect(toolResults).toHaveLength(2);

    // Results should match
    expect((toolResults[0] as any).result).toBe(3); // 1 + 2
    expect((toolResults[1] as any).result).toBe(12); // 3 * 4
  });

  it("events maintain callId correlation", async () => {
    const events: ExecutionEvent[] = [];
    const { tools } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => events.push(e),
    });

    const callId = "unique-call-id-12345";

    await simulateMessage(
      client,
      encode("tool_call", { id: callId, tool: "add", arguments: { a: 5, b: 5 } }),
      50
    );

    const callEvent = events.find((e) => e.type === "tool_call") as any;
    const resultEvent = events.find((e) => e.type === "tool_result") as any;

    // Both events should have the same callId for correlation
    expect(callEvent.callId).toBe(callId);
    expect(resultEvent.callId).toBe(callId);
  });
});

describe("Event ordering guarantees", () => {
  it("tool_call always precedes tool_result for same callId", async () => {
    const eventOrder: string[] = [];
    const { tools } = createTestTools();

    const client = new RelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools,
      onEvent: (e) => eventOrder.push(`${e.type}:${(e as any).callId || ""}`),
    });

    await simulateMessage(
      client,
      encode("tool_call", { id: "order-test", tool: "add", arguments: { a: 1, b: 1 } }),
      50
    );

    const callIndex = eventOrder.findIndex((e) => e.startsWith("tool_call:order-test"));
    const resultIndex = eventOrder.findIndex((e) => e.startsWith("tool_result:order-test"));

    expect(callIndex).toBeGreaterThanOrEqual(0);
    expect(resultIndex).toBeGreaterThanOrEqual(0);
    expect(callIndex).toBeLessThan(resultIndex);
  });
});
