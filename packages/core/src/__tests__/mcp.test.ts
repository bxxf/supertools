import { describe, expect, it } from "bun:test";
import {
  buildMcpSystemPrompt,
  defineTool,
  extractCode,
  z,
  zodToolsToMcp,
  zodToolToMcp,
} from "../index";

describe("zodToolToMcp", () => {
  it("converts a simple tool to MCP format", () => {
    const tool = defineTool({
      name: "getUsers",
      description: "Get all users",
      parameters: z.object({
        limit: z.number().optional(),
      }),
      execute: async () => [],
    });

    const mcpTool = zodToolToMcp(tool, { serverName: "host" });

    expect(mcpTool.name).toBe("get_users");
    expect(mcpTool.server).toBe("host");
    expect(mcpTool.description).toBe("Get all users");
    expect(mcpTool.inputSchema).toBeDefined();
    expect(mcpTool.inputSchema.properties).toHaveProperty("limit");
  });

  it("includes output schema when returns is defined", () => {
    const tool = defineTool({
      name: "getUser",
      description: "Get a user by ID",
      parameters: z.object({ id: z.number() }),
      returns: z.object({
        id: z.number(),
        name: z.string(),
      }),
      execute: async () => ({ id: 1, name: "Alice" }),
    });

    const mcpTool = zodToolToMcp(tool, { serverName: "host" });

    expect(mcpTool.outputSchema).toBeDefined();
    expect(mcpTool.outputSchema?.properties).toHaveProperty("id");
    expect(mcpTool.outputSchema?.properties).toHaveProperty("name");
  });

  it("handles required and optional parameters", () => {
    const tool = defineTool({
      name: "search",
      description: "Search for items",
      parameters: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      execute: async () => [],
    });

    const mcpTool = zodToolToMcp(tool, { serverName: "host" });

    expect(mcpTool.inputSchema.required).toContain("query");
    expect(mcpTool.inputSchema.required).not.toContain("limit");
  });

  it("handles enum types", () => {
    const tool = defineTool({
      name: "filter",
      description: "Filter items",
      parameters: z.object({
        status: z.enum(["active", "inactive"]),
      }),
      execute: async () => [],
    });

    const mcpTool = zodToolToMcp(tool, { serverName: "host" });
    const statusSchema = mcpTool.inputSchema.properties.status as Record<string, unknown>;

    expect(statusSchema.enum).toEqual(["active", "inactive"]);
  });

  it("handles array types", () => {
    const tool = defineTool({
      name: "process",
      description: "Process items",
      parameters: z.object({
        ids: z.array(z.number()),
      }),
      execute: async () => [],
    });

    const mcpTool = zodToolToMcp(tool, { serverName: "host" });
    const idsSchema = mcpTool.inputSchema.properties.ids as Record<string, unknown>;

    expect(idsSchema.type).toBe("array");
    expect((idsSchema.items as Record<string, unknown>).type).toBe("number");
  });
});

describe("zodToolsToMcp", () => {
  it("converts multiple tools", () => {
    const tools = [
      defineTool({
        name: "getUsers",
        description: "Get all users",
        parameters: z.object({}),
        execute: async () => [],
      }),
      defineTool({
        name: "getOrders",
        description: "Get all orders",
        parameters: z.object({}),
        execute: async () => [],
      }),
    ];

    const mcpTools = zodToolsToMcp(tools, { serverName: "api" });

    expect(mcpTools).toHaveLength(2);
    expect(mcpTools[0].server).toBe("api");
    expect(mcpTools[1].server).toBe("api");
  });
});

describe("buildMcpSystemPrompt", () => {
  it("generates a valid system prompt", () => {
    const tools = [
      defineTool({
        name: "getUsers",
        description: "Get all users from database",
        parameters: z.object({
          role: z.enum(["admin", "user"]).optional(),
        }),
        execute: async () => [],
      }),
    ];

    const mcpTools = zodToolsToMcp(tools, { serverName: "host" });
    const prompt = buildMcpSystemPrompt(mcpTools);

    expect(prompt).toContain("mcp.call");
    expect(prompt).toContain("host.get_users");
    expect(prompt).toContain("Get all users from database");
    expect(prompt).toContain("Promise.all");
  });

  it("includes additional instructions", () => {
    const mcpTools = zodToolsToMcp([], { serverName: "host" });
    const prompt = buildMcpSystemPrompt(mcpTools, "Always be concise");

    expect(prompt).toContain("Always be concise");
  });

  it("groups tools by server", () => {
    const tool1 = defineTool({
      name: "getUsers",
      description: "Get users",
      parameters: z.object({}),
      execute: async () => [],
    });
    const tool2 = defineTool({
      name: "getOrders",
      description: "Get orders",
      parameters: z.object({}),
      execute: async () => [],
    });

    const mcpTools = [
      zodToolToMcp(tool1, { serverName: "users" }),
      zodToolToMcp(tool2, { serverName: "orders" }),
    ];

    const prompt = buildMcpSystemPrompt(mcpTools);

    expect(prompt).toContain("users");
    expect(prompt).toContain("orders");
  });
});

describe("extractCode", () => {
  it("extracts code from javascript code block", () => {
    const response = `Here's the code:

\`\`\`javascript
const result = await mcp.call('host.get_users', {});
return result;
\`\`\`

This will get all users.`;

    const code = extractCode(response);

    expect(code).toBe("const result = await mcp.call('host.get_users', {});\nreturn result;");
  });

  it("extracts code from js code block", () => {
    const response = `\`\`\`js
return 42;
\`\`\``;

    const code = extractCode(response);
    expect(code).toBe("return 42;");
  });

  it("extracts code from generic code block", () => {
    const response = `\`\`\`
const x = 1;
\`\`\``;

    const code = extractCode(response);
    expect(code).toBe("const x = 1;");
  });

  it("returns raw code if it looks like code", () => {
    const response = 'const x = await mcp.call("host.test", {});';
    const code = extractCode(response);
    expect(code).toBe(response);
  });

  it("throws if no code block found and text does not look like code", () => {
    const response = "This is just some text without any code.";
    expect(() => extractCode(response)).toThrow(/no code block/i);
  });

  it("handles code with multiple code blocks (takes first)", () => {
    const response = `\`\`\`javascript
const first = 1;
\`\`\`

\`\`\`javascript
const second = 2;
\`\`\``;

    const code = extractCode(response);
    expect(code).toBe("const first = 1;");
  });
});
