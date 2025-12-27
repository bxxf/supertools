/**
 * MCP-aware System Prompts
 *
 * Generates prompts for LLM code generation that uses the MCP tool calling pattern.
 * Tools are called via: await mcp.call('server.tool_name', { args })
 */

import type { McpTool } from "./types";

export function buildMcpSystemPrompt(
  tools: readonly McpTool[],
  additionalInstructions?: string
): string {
  const toolDocs = generateMcpToolDocs(tools);

  return `<system>
<role>
You are an expert JavaScript programmer optimizing for SPEED. Write code that uses MCP tools to accomplish the user's request as fast as possible.
</role>

<critical_performance_rules>
1. ALWAYS run independent tool calls in PARALLEL using Promise.all()
2. Only await sequentially when a call DEPENDS on a previous result
3. Minimize the number of tool calls - batch when possible
4. Do not use comments or console.log or any extra text - output ONLY the final code
</critical_performance_rules>

<mcp_usage>
All tools are accessed through the \`mcp\` object:
\`\`\`javascript
// Single call
const result = await mcp.call('server.tool_name', { arg1: value1 });

// Parallel calls (PREFERRED for independent operations)
const [result1, result2] = await Promise.all([
  mcp.call('server.tool1', { arg1: value1 }),
  mcp.call('server.tool2', { arg2: value2 })
]);
\`\`\`
</mcp_usage>

<output_rules>
Use \`return\` to output the final result. The return value is automatically captured.
</output_rules>

<examples>
<example>
<task>Get users and orders, then analyze</task>
<code>
// PARALLEL: users and orders are independent
const [users, orders] = await Promise.all([
  mcp.call('host.get_users', {}),
  mcp.call('host.get_orders', {})
]);
// SEQUENTIAL: stats depends on orders
const stats = await mcp.call('host.calculate_stats', { values: orders.map(o => o.total) });
return { users, orders, stats };
</code>
</example>
<example>
<task>Create GitHub issue and notify</task>
<code>
const issue = await mcp.call('github.create_issue', {
  repo: 'org/repo',
  title: 'Bug Report',
  body: 'Details here'
});
return { issueUrl: issue.html_url };
</code>
</example>
</examples>
<output_format>
Return ONLY executable JavaScript in a \`\`\`javascript code block. No explanations.
</output_format>
${additionalInstructions ? `\n<additional_instructions>\n${additionalInstructions}\n</additional_instructions>` : ""}
<available_tools>
${toolDocs}
</available_tools>
</system>`;
}

function generateMcpToolDocs(tools: readonly McpTool[]): string {
  if (tools.length === 0) return "// No tools available";

  const lines: string[] = [
    "// MCP Tools",
    "// Call with: await mcp.call('server.tool_name', { args })",
    "",
  ];

  // Group by server
  const byServer = groupByServer(tools);

  for (const [serverName, serverTools] of byServer) {
    lines.push(`// === ${serverName} ===`);
    for (const tool of serverTools) {
      lines.push(generateToolDoc(tool));
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Group tools by their server name
 */
function groupByServer(tools: readonly McpTool[]): Map<string, McpTool[]> {
  const groups = new Map<string, McpTool[]>();
  for (const tool of tools) {
    const list = groups.get(tool.server) ?? [];
    list.push(tool);
    groups.set(tool.server, list);
  }
  return groups;
}

/**
 * Generate documentation for a single tool
 */
function generateToolDoc(tool: McpTool): string {
  const fullName = `${tool.server}.${tool.name}`;
  const params = generateParamsDoc(tool.inputSchema);
  const returns = tool.outputSchema ? jsonSchemaToTsType(tool.outputSchema) : "unknown";

  const lines = [`/**`, ` * ${tool.description}`];

  // Document parameters
  const props = tool.inputSchema.properties;
  const required = new Set(tool.inputSchema.required ?? []);
  for (const [name, schema] of Object.entries(props)) {
    const schemaObj = schema as Record<string, unknown>;
    const desc = schemaObj.description || "No description";
    const opt = !required.has(name) ? " (optional)" : "";
    lines.push(` * @param ${name} - ${desc}${opt}`);
  }

  if (tool.outputSchema) {
    lines.push(` * @returns ${returns}`);
  }

  lines.push(` */`);
  lines.push(`// mcp.call('${fullName}', ${params}): Promise<${returns}>`);

  return lines.join("\n");
}

/**
 * Generate TypeScript-like params documentation
 */
function generateParamsDoc(schema: {
  properties: Record<string, unknown>;
  required?: readonly string[];
}): string {
  const props = schema.properties;
  const required = new Set(schema.required ?? []);

  const entries = Object.entries(props).map(([name, propSchema]) => {
    const schemaObj = propSchema as Record<string, unknown>;
    const type = jsonSchemaToTsType(schemaObj);
    const opt = !required.has(name) ? "?" : "";
    return `${name}${opt}: ${type}`;
  });

  if (entries.length === 0) return "{}";
  return `{ ${entries.join(", ")} }`;
}

/**
 * Extract code from LLM response
 */
export function extractCode(response: string): string {
  const jsMatch = response.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/);
  if (jsMatch) return jsMatch[1].trim();

  const genericMatch = response.match(/```\s*\n([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();

  const trimmed = response.trim();
  const looksLikeCode = /(?:const|let|var|await|function|=>|return|\(.*\))/.test(trimmed);

  if (!looksLikeCode) {
    throw new Error(
      `No code block found in LLM response. Expected \`\`\`javascript block but got: "${trimmed.slice(0, 100)}..."`
    );
  }

  return trimmed;
}

function jsonSchemaToTsType(schema: Record<string, unknown>): string {
  const type = schema.type as string;

  switch (type) {
    case "string":
      if (schema.enum) {
        return (schema.enum as string[]).map((v) => `'${v}'`).join(" | ");
      }
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "array": {
      const items = schema.items as Record<string, unknown> | undefined;
      const itemType = items ? jsonSchemaToTsType(items) : "unknown";
      return `${itemType}[]`;
    }
    case "object": {
      const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
      if (!props) return "Record<string, unknown>";
      const required = new Set((schema.required as string[]) ?? []);
      const entries = Object.entries(props)
        .map(([k, v]) => {
          const opt = !required.has(k) ? "?" : "";
          return `${k}${opt}: ${jsonSchemaToTsType(v)}`;
        })
        .join("; ");
      return `{ ${entries} }`;
    }
    case "null":
      return "null";
    default:
      if (schema.anyOf || schema.oneOf) {
        const union = (schema.anyOf || schema.oneOf) as Record<string, unknown>[];
        return union.map((s) => jsonSchemaToTsType(s)).join(" | ");
      }
      return "unknown";
  }
}
