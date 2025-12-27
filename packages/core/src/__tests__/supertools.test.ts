import { describe, expect, it, mock } from "bun:test";
import type { Sandbox } from "e2b";
import { detectProvider, supertools } from "../supertools";
import { defineTool, z } from "../tool";
import { ConfigurationError } from "../utils/errors";

// Mock Anthropic client
function createMockAnthropicClient() {
  return {
    messages: {
      create: mock(async () => ({
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Test response" }],
        model: "claude-sonnet-4-5",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      })),
    },
  };
}

// Mock sandbox
function createMockSandbox(): Sandbox {
  return {
    sandboxId: "test-sandbox-123",
    getHost: mock(() => "sandbox.example.com:3000"),
  } as unknown as Sandbox;
}

// Test tools
const testTools = [
  defineTool({
    name: "getUsers",
    description: "Get all users from the database",
    parameters: z.object({}),
    execute: async () => [{ id: 1, name: "Alice" }],
  }),
];

describe("detectProvider", () => {
  it("detects Anthropic client", () => {
    const client = createMockAnthropicClient();
    expect(detectProvider(client)).toBe("anthropic");
  });

  it("returns null for unknown client", () => {
    expect(detectProvider({})).toBeNull();
    expect(detectProvider(null)).toBeNull();
    expect(detectProvider({ someApi: {} })).toBeNull();
  });

  it("returns null for OpenAI-like client (not yet supported)", () => {
    const openaiLike = {
      chat: {
        completions: {
          create: mock(async () => ({})),
        },
      },
    };
    expect(detectProvider(openaiLike)).toBeNull();
  });
});

describe("supertools", () => {
  it("wraps Anthropic client", () => {
    const client = createMockAnthropicClient();
    const sandbox = createMockSandbox();

    const wrapped = supertools(client, {
      tools: testTools,
      sandbox,
    });

    expect(wrapped).toBeDefined();
    expect(wrapped.messages).toBeDefined();
    expect(typeof wrapped.messages.create).toBe("function");
  });

  it("throws ConfigurationError for unsupported client", () => {
    const unsupportedClient = { someApi: {} };
    const sandbox = createMockSandbox();

    expect(() =>
      supertools(unsupportedClient, {
        tools: testTools,
        sandbox,
      })
    ).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when tools is not an array", () => {
    const client = createMockAnthropicClient();
    const sandbox = createMockSandbox();

    expect(() =>
      supertools(client, {
        tools: "not an array" as any,
        sandbox,
      })
    ).toThrow(ConfigurationError);

    expect(() =>
      supertools(client, {
        tools: null as any,
        sandbox,
      })
    ).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when sandbox is missing", () => {
    const client = createMockAnthropicClient();

    expect(() =>
      supertools(client, {
        tools: testTools,
        sandbox: undefined as any,
      })
    ).toThrow(ConfigurationError);
  });

  it("accepts optional config options", () => {
    const client = createMockAnthropicClient();
    const sandbox = createMockSandbox();
    const onEvent = mock(() => {});

    const wrapped = supertools(client, {
      tools: testTools,
      sandbox,
      instructions: "Be concise",
      debug: true,
      onEvent,
    });

    expect(wrapped).toBeDefined();
  });

  it("works with empty tools array", () => {
    const client = createMockAnthropicClient();
    const sandbox = createMockSandbox();

    const wrapped = supertools(client, {
      tools: [],
      sandbox,
    });

    expect(wrapped).toBeDefined();
  });

  it("preserves client type", () => {
    const client = createMockAnthropicClient();
    const sandbox = createMockSandbox();

    const wrapped = supertools(client, {
      tools: testTools,
      sandbox,
    });

    // Should have same structure as original
    expect("messages" in wrapped).toBe(true);
    expect("create" in wrapped.messages).toBe(true);
  });
});
