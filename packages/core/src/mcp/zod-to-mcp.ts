/**
 * Zod to MCP Converter
 *
 * Converts Zod tool definitions to MCP-compatible format.
 */

import type { AnyTool } from '../tool';
import type { McpTool, McpInputSchema } from './types';
import { toSnakeCase } from '../utils/string';

export interface ZodToMcpOptions {
  /** Server name for these tools (used in tool routing) */
  serverName: string;
  /** Include output schema in tool definition */
  includeOutputSchema?: boolean;
}

export function zodToolToMcp(tool: AnyTool, options: ZodToMcpOptions): McpTool {
  const { serverName, includeOutputSchema = true } = options;

  // Local tools get 'local' server name, remote tools use provided serverName
  const server = tool.local ? 'local' : serverName;

  // Convert parameters schema to JSON Schema using Zod 4's built-in method
  const jsonSchema = (tool.parameters as { toJSONSchema(): Record<string, unknown> }).toJSONSchema();

  // Extract the input schema in MCP format
  const inputSchema = extractInputSchema(jsonSchema);

  // Build the MCP tool definition
  const mcpTool: McpTool = {
    name: toSnakeCase(tool.name),
    description: tool.description,
    inputSchema,
    server,
  };

  // Optionally include output schema for better code generation
  if (includeOutputSchema && tool.returns) {
    const outputJsonSchema = (tool.returns as { toJSONSchema(): Record<string, unknown> }).toJSONSchema();
    return {
      ...mcpTool,
      outputSchema: outputJsonSchema,
    };
  }

  return mcpTool;
}

/**
 * Convert multiple Zod tools to MCP tool definitions
 */
export function zodToolsToMcp(tools: readonly AnyTool[], options: ZodToMcpOptions): McpTool[] {
  return tools.map((tool) => zodToolToMcp(tool, options));
}

/**
 * Extract MCP-compatible input schema from JSON Schema
 */
function extractInputSchema(jsonSchema: Record<string, unknown>): McpInputSchema {
  // Remove $schema and definitions that aren't needed for MCP
  const { $schema, definitions, $defs, ...rest } = jsonSchema as {
    $schema?: string;
    definitions?: unknown;
    $defs?: unknown;
    type?: string;
    properties?: Record<string, unknown>;
    required?: readonly string[];
    [key: string]: unknown;
  };

  // Ensure we have an object type
  if (rest.type !== 'object') {
    // Wrap non-object schemas in an object with a single 'input' property
    return {
      type: 'object',
      properties: { input: rest },
      required: ['input'],
    };
  }

  return {
    type: 'object',
    properties: (rest.properties ?? {}) as Record<string, unknown>,
    required: rest.required,
  };
}

/**
 * Generate TypeScript type hints from MCP tools for code generation
 */
export function generateMcpTypeHints(tools: readonly McpTool[]): string {
  const lines: string[] = [
    '// MCP Tool Types',
    '// Auto-generated from tool definitions',
    '',
  ];

  // Group tools by server
  const byServer = new Map<string, McpTool[]>();
  for (const tool of tools) {
    const list = byServer.get(tool.server) ?? [];
    list.push(tool);
    byServer.set(tool.server, list);
  }

  // Generate interface for each server's tools
  for (const [serverName, serverTools] of byServer) {
    lines.push(`// ${serverName} tools`);
    for (const tool of serverTools) {
      lines.push(generateToolTypeHint(tool));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate TypeScript type hint for a single tool
 */
function generateToolTypeHint(tool: McpTool): string {
  const params = generateParamsType(tool.inputSchema);
  const returns = tool.outputSchema
    ? jsonSchemaToTsType(tool.outputSchema)
    : 'unknown';

  return `/**
 * ${tool.description}
 */
declare function ${tool.name}(${params}): Promise<${returns}>;
`;
}

/**
 * Generate TypeScript params type from input schema
 */
function generateParamsType(schema: McpInputSchema): string {
  const props = schema.properties;
  const required = new Set(schema.required ?? []);

  const params = Object.entries(props).map(([name, propSchema]) => {
    const isRequired = required.has(name);
    const type = jsonSchemaToTsType(propSchema as Record<string, unknown>);
    return `${name}${isRequired ? '' : '?'}: ${type}`;
  });

  if (params.length === 0) return '';
  if (params.length === 1) return params[0];
  return `params: { ${params.join('; ')} }`;
}

/**
 * Convert JSON Schema to TypeScript type (simplified)
 */
function jsonSchemaToTsType(schema: Record<string, unknown>): string {
  const type = schema.type as string;

  switch (type) {
    case 'string':
      if (schema.enum) {
        return (schema.enum as string[]).map((v) => `'${v}'`).join(' | ');
      }
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array': {
      const items = schema.items as Record<string, unknown> | undefined;
      const itemType = items ? jsonSchemaToTsType(items) : 'unknown';
      return `${itemType}[]`;
    }
    case 'object': {
      const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
      if (!props) return 'Record<string, unknown>';
      const required = new Set((schema.required as string[]) ?? []);
      const entries = Object.entries(props)
        .map(([k, v]) => {
          const opt = !required.has(k) ? '?' : '';
          return `${k}${opt}: ${jsonSchemaToTsType(v)}`;
        })
        .join('; ');
      return `{ ${entries} }`;
    }
    case 'null':
      return 'null';
    default:
      // Handle union types (anyOf, oneOf)
      if (schema.anyOf || schema.oneOf) {
        const union = (schema.anyOf || schema.oneOf) as Record<string, unknown>[];
        return union.map((s) => jsonSchemaToTsType(s)).join(' | ');
      }
      return 'unknown';
  }
}
