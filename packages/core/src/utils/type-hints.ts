import type { z } from 'zod';
import type { AnyTool } from '../tool';
import { toSnakeCase } from './string';

type ZodSchema = z.ZodType;

interface ZodDef {
  type: string;
  entries?: Record<string, string>;
  element?: ZodSchema;
  shape?: () => Record<string, ZodSchema>;
  innerType?: ZodSchema;
  defaultValue?: unknown | (() => unknown);
  value?: unknown;
  checks?: Array<{ isInt?: boolean }>;
  items?: readonly ZodSchema[];
  keyType?: ZodSchema;
  valueType?: ZodSchema;
  options?: readonly ZodSchema[];
}

const MAX_DEPTH = 10;

export function generateTypeHints(tools: readonly AnyTool[]): string {
  if (tools.length === 0) return '// No tools available';

  const signatures = tools.map(generateToolSignature);
  return ['// Available Tools', '// Call these as: const result = await tool_name({ args })', '', ...signatures].join('\n');
}

function generateToolSignature(tool: AnyTool): string {
  const snakeName = toSnakeCase(tool.name);
  const params = generateParams(tool.parameters);
  const returnType = tool.returns ? zodToJS(tool.returns, 0) : 'any';

  const lines = [
    `/**`,
    ` * ${tool.description}`,
  ];

  const shape = getObjectShape(tool.parameters);
  if (shape && Object.keys(shape).length > 0) {
    lines.push(` *`);
    for (const [name, schema] of Object.entries(shape)) {
      const desc = getDescription(schema);
      const opt = isOptional(schema) ? ' (optional)' : '';
      lines.push(` * @param ${name} - ${desc || 'No description'}${opt}`);
    }
  }

  // Add @returns documentation if returns schema is defined
  if (tool.returns) {
    lines.push(` * @returns ${returnType}`);
  }

  lines.push(` */`);
  lines.push(`async function ${snakeName}(${params}): Promise<${returnType}>`);
  lines.push('');

  return lines.join('\n');
}

function generateParams(schema: ZodSchema): string {
  const shape = getObjectShape(schema);
  if (!shape || Object.keys(shape).length === 0) return '';

  const entries = Object.entries(shape);
  const required: string[] = [];
  const optional: string[] = [];

  for (const [name, fieldSchema] of entries) {
    const jsType = zodToJS(fieldSchema, 0);
    if (isOptional(fieldSchema)) {
      optional.push(`${name}?: ${jsType}`);
    } else {
      required.push(`${name}: ${jsType}`);
    }
  }

  const allParams = [...required, ...optional];
  if (allParams.length === 0) return '';

  return `{ ${allParams.join(', ')} }`;
}

function zodToJS(schema: ZodSchema, depth: number): string {
  if (depth > MAX_DEPTH) return 'any';

  const def = getDef(schema);
  const typeName = def.type;

  switch (typeName) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'bigint':
      return 'bigint';
    case 'literal': {
      const val = def.value;
      if (typeof val === 'string') return `'${val}'`;
      return String(val);
    }
    case 'enum': {
      const entries = def.entries;
      if (!entries || typeof entries !== 'object') return 'string';
      const values = Object.values(entries);
      if (values.length === 0) return 'string';
      return values.map(v => `'${v}'`).join(' | ');
    }
    case 'array': {
      const element = def.element;
      if (element) return `${zodToJS(element, depth + 1)}[]`;
      return 'any[]';
    }
    case 'tuple': {
      const items = def.items ?? [];
      if (items.length === 0) return '[]';
      return `[${items.map(i => zodToJS(i, depth + 1)).join(', ')}]`;
    }
    case 'set': {
      const element = def.element;
      if (element) return `Set<${zodToJS(element, depth + 1)}>`;
      return 'Set<any>';
    }
    case 'object': {
      const shape = getObjectShape(schema);
      if (!shape || Object.keys(shape).length === 0) return 'object';
      // Generate full object type for better LLM understanding
      const entries = Object.entries(shape).map(([key, val]) => {
        const valType = zodToJS(val, depth + 1);
        const optional = isOptional(val) ? '?' : '';
        return `${key}${optional}: ${valType}`;
      });
      return `{ ${entries.join(', ')} }`;
    }
    case 'record': {
      const valType = def.valueType ? zodToJS(def.valueType, depth + 1) : 'any';
      return `Record<string, ${valType}>`;
    }
    case 'map': {
      const keyType = def.keyType ? zodToJS(def.keyType, depth + 1) : 'any';
      const valType = def.valueType ? zodToJS(def.valueType, depth + 1) : 'any';
      return `Map<${keyType}, ${valType}>`;
    }
    case 'union': {
      const options = def.options ?? [];
      if (options.length === 0) return 'any';
      const types = options.map(o => zodToJS(o, depth + 1));
      const unique = [...new Set(types)];
      return unique.join(' | ');
    }
    case 'optional':
    case 'nullable': {
      const inner = def.innerType;
      if (inner) return `${zodToJS(inner, depth + 1)} | null`;
      return 'any | null';
    }
    case 'default': {
      const inner = def.innerType;
      if (inner) return zodToJS(inner, depth + 1);
      return 'any';
    }
    case 'null':
    case 'undefined':
    case 'void':
      return 'null';
    case 'any':
    case 'unknown':
      return 'any';
    case 'never':
      return 'never';
    case 'date':
      return 'Date';
    default:
      return 'any';
  }
}

function getDef(schema: ZodSchema): ZodDef {
  const s = schema as { _zod?: { def?: ZodDef } };
  return s._zod?.def ?? { type: 'unknown' };
}

function getObjectShape(schema: ZodSchema): Record<string, ZodSchema> | null {
  const def = getDef(schema);
  if (def.type !== 'object') return null;
  const shape = def.shape;
  if (!shape) return null;
  return typeof shape === 'function' ? shape() : shape as Record<string, ZodSchema>;
}

function getDescription(schema: ZodSchema): string {
  const s = schema as { description?: string };
  if (s.description) return s.description;
  const def = getDef(schema);
  if (def.innerType) return getDescription(def.innerType);
  return '';
}

function isOptional(schema: ZodSchema): boolean {
  const def = getDef(schema);
  return def.type === 'optional' || def.type === 'default' || def.type === 'nullable';
}

