import { describe, expect, it, mock } from "bun:test";
import type { Sandbox } from "e2b";
import { createExecutor, ProgrammaticExecutor } from "../executor";
import { defineTool, z } from "../tool";
import type { GeneratedCode, LLMAdapter } from "../types";

// Mock LLM adapter
function createMockLLM(response: Partial<GeneratedCode> = {}): LLMAdapter {
  return {
    generateCode: mock(async () => ({
      code: response.code ?? "```javascript\nreturn 42;\n```",
      explanation: response.explanation ?? "Test explanation",
      usage: response.usage ?? { inputTokens: 100, outputTokens: 50 },
    })),
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
    parameters: z.object({
      limit: z.number().optional(),
    }),
    execute: async ({ limit }) => [{ id: 1, name: "Alice" }].slice(0, limit),
  }),
  defineTool({
    name: "calculate",
    description: "Calculate sum of numbers locally",
    parameters: z.object({
      values: z.array(z.number()),
    }),
    local: true,
    execute: async ({ values }) => values.reduce((a, b) => a + b, 0),
  }),
];

describe("ProgrammaticExecutor", () => {
  describe("constructor", () => {
    it("creates executor with required options", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      expect(executor).toBeInstanceOf(ProgrammaticExecutor);
    });

    it("normalizes tools on creation", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const tools = executor.getTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe("get_users"); // snake_case
      expect(tools[1].name).toBe("calculate");
    });

    it("pre-computes MCP tools", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const mcpTools = executor.getMcpTools();
      expect(mcpTools).toHaveLength(2);
      expect(mcpTools[0].server).toBe("host");
      expect(mcpTools[1].server).toBe("local"); // local tool
    });

    it("accepts custom instructions", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
        instructions: "Always return JSON",
      });

      // Instructions are incorporated into system prompt
      expect(executor).toBeDefined();
    });

    it("accepts debug flag", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
        debug: true,
      });

      expect(executor).toBeDefined();
    });

    it("accepts onEvent callback", () => {
      const onEvent = mock(() => {});
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
        onEvent,
      });

      expect(executor).toBeDefined();
    });
  });

  describe("getTools", () => {
    it("returns normalized tools", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const tools = executor.getTools();
      expect(tools[0].name).toBe("get_users");
      expect(tools[0].description).toBe("Get all users from the database");
      expect(tools[0].parameters).toHaveLength(1);
    });

    it("includes local code for local tools", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const tools = executor.getTools();
      const localTool = tools.find((t) => t.name === "calculate");
      expect(localTool?.localCode).toBeDefined();
      expect(localTool?.localCode).toContain("reduce");
    });
  });

  describe("getMcpTools", () => {
    it("returns MCP-formatted tools", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const mcpTools = executor.getMcpTools();
      expect(mcpTools[0].inputSchema).toBeDefined();
      expect(mcpTools[0].inputSchema.type).toBe("object");
    });

    it("assigns correct server names", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const mcpTools = executor.getMcpTools();
      const hostTool = mcpTools.find((t) => t.name === "get_users");
      const localTool = mcpTools.find((t) => t.name === "calculate");

      expect(hostTool?.server).toBe("host");
      expect(localTool?.server).toBe("local");
    });
  });

  describe("getToolDocumentation", () => {
    it("returns tool documentation from system prompt", () => {
      const executor = createExecutor({
        llm: createMockLLM(),
        tools: testTools,
        sandbox: createMockSandbox(),
      });

      const docs = executor.getToolDocumentation();
      // May be empty if system prompt format doesn't include <available_tools>
      expect(typeof docs).toBe("string");
    });
  });
});

describe("createExecutor", () => {
  it("is a factory function for ProgrammaticExecutor", () => {
    const executor = createExecutor({
      llm: createMockLLM(),
      tools: testTools,
      sandbox: createMockSandbox(),
    });

    expect(executor).toBeInstanceOf(ProgrammaticExecutor);
  });
});
