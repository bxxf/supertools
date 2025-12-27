import { describe, expect, it } from "bun:test";
import { defineTool, isTool, normalizeTools, z } from "../index";

describe("defineTool", () => {
  it("creates a valid tool with required fields", () => {
    const tool = defineTool({
      name: "getUsers",
      description: "Get all users from the database",
      parameters: z.object({
        limit: z.number().optional(),
      }),
      execute: async () => [{ id: 1, name: "Alice" }],
    });

    expect(tool.name).toBe("getUsers");
    expect(tool.description).toBe("Get all users from the database");
    expect(typeof tool.execute).toBe("function");
  });

  it("creates a tool with returns schema", () => {
    const tool = defineTool({
      name: "getUser",
      description: "Get a single user by ID",
      parameters: z.object({
        id: z.number(),
      }),
      returns: z.object({
        id: z.number(),
        name: z.string(),
      }),
      execute: async ({ id }) => ({ id, name: "Alice" }),
    });

    expect(tool.returns).toBeDefined();
  });

  it("creates a local tool", () => {
    const tool = defineTool({
      name: "calculate",
      description: "Calculate sum of numbers",
      parameters: z.object({
        values: z.array(z.number()),
      }),
      local: true,
      execute: async ({ values }) => values.reduce((a, b) => a + b, 0),
    });

    expect(tool.local).toBe(true);
  });
});

describe("normalizeTools", () => {
  it("normalizes a single tool", () => {
    const tool = defineTool({
      name: "getUsers",
      description: "Get all users",
      parameters: z.object({}),
      execute: async () => [],
    });

    const normalized = normalizeTools([tool]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].name).toBe("get_users"); // snake_case
    expect(normalized[0].description).toBe("Get all users");
  });

  it("converts camelCase to snake_case", () => {
    const tool = defineTool({
      name: "getUserById",
      description: "Get user by ID",
      parameters: z.object({ id: z.number() }),
      execute: async () => null,
    });

    const [normalized] = normalizeTools([tool]);
    expect(normalized.name).toBe("get_user_by_id");
  });

  it("extracts parameters correctly", () => {
    const tool = defineTool({
      name: "search",
      description: "Search for items",
      parameters: z.object({
        query: z.string().describe("Search query"),
        limit: z.number().optional().describe("Max results"),
      }),
      execute: async () => [],
    });

    const [normalized] = normalizeTools([tool]);

    expect(normalized.parameters).toHaveLength(2);

    const queryParam = normalized.parameters.find((p) => p.name === "query");
    expect(queryParam).toBeDefined();
    expect(queryParam?.type).toBe("string");
    expect(queryParam?.required).toBe(true);
    expect(queryParam?.description).toBe("Search query");

    const limitParam = normalized.parameters.find((p) => p.name === "limit");
    expect(limitParam).toBeDefined();
    expect(limitParam?.type).toBe("number");
    expect(limitParam?.required).toBe(false);
  });

  it("handles array parameters", () => {
    const tool = defineTool({
      name: "process",
      description: "Process items",
      parameters: z.object({
        ids: z.array(z.number()),
      }),
      execute: async () => null,
    });

    const [normalized] = normalizeTools([tool]);
    const idsParam = normalized.parameters.find((p) => p.name === "ids");

    expect(idsParam?.type).toBe("array");
    expect(idsParam?.required).toBe(true);
  });

  it("handles enum parameters", () => {
    const tool = defineTool({
      name: "filter",
      description: "Filter by status",
      parameters: z.object({
        status: z.enum(["active", "inactive", "pending"]),
      }),
      execute: async () => null,
    });

    const [normalized] = normalizeTools([tool]);
    const statusParam = normalized.parameters.find((p) => p.name === "status");

    // normalizeTools converts enums to 'string' type (enum values preserved in MCP conversion)
    expect(statusParam?.type).toBe("string");
    expect(statusParam?.required).toBe(true);
  });

  it("serializes local tool code", () => {
    const tool = defineTool({
      name: "calculate",
      description: "Calculate stats",
      parameters: z.object({ values: z.array(z.number()) }),
      local: true,
      execute: async ({ values }) => ({
        sum: values.reduce((a, b) => a + b, 0),
      }),
    });

    const [normalized] = normalizeTools([tool]);

    expect(normalized.localCode).toBeDefined();
    expect(normalized.localCode).toContain("values");
    expect(normalized.localCode).toContain("reduce");
  });

  it("normalizes tools with same snake_case name (no dedup)", () => {
    const tools = [
      defineTool({
        name: "getUsers",
        description: "Get users",
        parameters: z.object({}),
        execute: async () => [],
      }),
      defineTool({
        name: "get_users", // Same after normalization
        description: "Get users again",
        parameters: z.object({}),
        execute: async () => [],
      }),
    ];

    // normalizeTools doesn't deduplicate - it's the caller's responsibility
    const normalized = normalizeTools(tools);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].name).toBe("get_users");
    expect(normalized[1].name).toBe("get_users");
  });

  it("throws on invalid tool name", () => {
    expect(() =>
      defineTool({
        name: "123invalid",
        description: "Invalid name",
        parameters: z.object({}),
        execute: async () => null,
      })
    ).toThrow();
  });

  it("throws on short description", () => {
    expect(() =>
      defineTool({
        name: "test",
        description: "Hi", // Too short
        parameters: z.object({}),
        execute: async () => null,
      })
    ).toThrow();
  });
});

describe("isTool", () => {
  it("returns true for valid tool", () => {
    const tool = defineTool({
      name: "test",
      description: "Test tool",
      parameters: z.object({}),
      execute: async () => null,
    });

    expect(isTool(tool)).toBe(true);
  });

  it("returns false for non-tool objects", () => {
    expect(isTool(null)).toBe(false);
    expect(isTool(undefined)).toBe(false);
    expect(isTool({})).toBe(false);
    expect(isTool({ name: "test" })).toBe(false);
    expect(isTool({ name: "test", execute: () => {} })).toBe(false);
  });
});
