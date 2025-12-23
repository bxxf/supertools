import { z } from 'zod';
import { toSnakeCase } from './utils/string';

const TOOL_BRAND = Symbol.for('supertools.tool');

type ZodSchema = z.ZodType;
type InferInput<T extends ZodSchema> = z.infer<T>;
type InferOutput<T extends ZodSchema> = z.infer<T>;

// Execute function type - if returns schema provided, enforce it
type ExecuteFn<TParams extends ZodSchema, TReturns extends ZodSchema | undefined> = (
  params: InferInput<TParams>
) => TReturns extends ZodSchema
  ? InferOutput<TReturns> | Promise<InferOutput<TReturns>>
  : unknown | Promise<unknown>;

export interface ToolDefinition<
  TParams extends ZodSchema,
  TReturns extends ZodSchema | undefined = undefined,
> {
  readonly name: string;
  readonly description: string;
  readonly parameters: TParams;
  readonly returns?: TReturns;
  readonly execute: ExecuteFn<TParams, TReturns>;
  /**
   * If true, tool runs locally in sandbox (no network round-trip).
   * Use for pure computation that doesn't need host resources.
   */
  readonly local?: boolean;
}

export interface Tool<
  TParams extends ZodSchema = ZodSchema,
  TReturns extends ZodSchema | undefined = undefined,
> {
  readonly name: string;
  readonly description: string;
  readonly parameters: TParams;
  readonly returns?: TReturns;
  readonly execute: ExecuteFn<TParams, TReturns>;
  readonly local?: boolean;
  readonly [TOOL_BRAND]: true;
}

// Any tool - used for arrays that can contain tools with different return types
export type AnyTool = Tool<ZodSchema, ZodSchema | undefined>;

export interface NormalizedParameter {
  readonly name: string;
  readonly type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'any';
  readonly description: string;
  readonly required: boolean;
  readonly default?: unknown;
}

export interface NormalizedTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: readonly NormalizedParameter[];
  readonly execute: (params: Record<string, unknown>) => unknown | Promise<unknown>;
  /** If set, this tool runs locally in sandbox using this code */
  readonly localCode?: string;
}

/**
 * Define a tool with type-safe parameters and optional return type.
 *
 * @example
 * const searchUsers = defineTool({
 *   name: 'searchUsers',
 *   description: 'Search users by name or email',
 *   parameters: z.object({
 *     query: z.string().describe('Search query'),
 *     limit: z.number().optional().default(10),
 *   }),
 *   returns: z.array(z.object({
 *     id: z.number(),
 *     name: z.string(),
 *   })),
 *   execute: async ({ query, limit }) => db.users.search(query).limit(limit),
 * });
 */
export function defineTool<TParams extends ZodSchema, TReturns extends ZodSchema | undefined = undefined>(
  definition: ToolDefinition<TParams, TReturns>
): Tool<TParams, TReturns> {
  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error('Tool name is required');
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(definition.name)) {
    throw new Error(`Invalid tool name "${definition.name}": must start with a letter and contain only alphanumeric characters and underscores`);
  }
  if (!definition.description || typeof definition.description !== 'string') {
    throw new Error('Tool description is required');
  }
  if (definition.description.length < 5) {
    throw new Error('Tool description must be at least 5 characters');
  }
  if (!isZodSchema(definition.parameters)) {
    throw new Error('Tool parameters must be a Zod schema');
  }
  if (getZodType(definition.parameters) !== 'object') {
    throw new Error(`Tool parameters must be z.object(), got z.${getZodType(definition.parameters)}()`);
  }
  if (typeof definition.execute !== 'function') {
    throw new Error('Tool execute must be a function');
  }

  return Object.freeze({
    name: definition.name,
    description: definition.description,
    parameters: definition.parameters,
    returns: definition.returns,
    execute: definition.execute,
    local: definition.local,
    [TOOL_BRAND]: true as const,
  });
}

export function isTool(value: unknown): value is Tool {
  return (
    typeof value === 'object' &&
    value !== null &&
    TOOL_BRAND in value &&
    (value as Record<symbol, unknown>)[TOOL_BRAND] === true
  );
}

export function normalizeTools(tools: readonly AnyTool[]): NormalizedTool[] {
  return tools.map((tool) => {
    if (!isTool(tool)) {
      throw new TypeError(`Expected Tool from defineTool(), got ${typeof tool}`);
    }

    // For local tools, extract the function body to run in sandbox
    let localCode: string | undefined;
    if (tool.local) {
      localCode = extractFunctionCode(tool.execute);
    }

    return Object.freeze({
      name: toSnakeCase(tool.name),
      description: tool.description,
      parameters: Object.freeze(extractParameters(tool.parameters)),
      execute: tool.execute as NormalizedTool['execute'],
      localCode,
    });
  });
}

/**
 * Extract function code for local execution in sandbox.
 * Converts the execute function to a string that can be eval'd.
 */
function extractFunctionCode(fn: Function): string {
  const fnStr = fn.toString();

  // Handle arrow functions: ({ x }) => x * 2  or  async ({ x }) => { ... }
  // Handle regular functions: function({ x }) { ... }  or  async function({ x }) { ... }

  // For arrow functions, wrap in async function
  if (fnStr.includes('=>')) {
    // async ({ params }) => result  →  async function(args) { return (({ params }) => result)(args); }
    return `async function(args) { return (${fnStr})(args); }`;
  }

  // For regular functions, just return as-is (rename to anonymous)
  return fnStr.replace(/^(async\s+)?function\s*\w*/, '$1function');
}

// Zod 4 introspection - accesses internal _zod.def structure

function isZodSchema(value: unknown): value is ZodSchema {
  return typeof value === 'object' && value !== null && '_zod' in value;
}

function getZodDef(schema: ZodSchema): Record<string, unknown> {
  const s = schema as { _zod?: { def?: unknown } };
  if (!s._zod?.def) {
    throw new Error('Invalid Zod schema: missing _zod.def');
  }
  return s._zod.def as Record<string, unknown>;
}

function getZodType(schema: ZodSchema): string {
  const def = getZodDef(schema);
  if (typeof def.type !== 'string') {
    throw new Error('Invalid Zod schema: missing type');
  }
  return def.type;
}

function extractParameters(schema: ZodSchema): NormalizedParameter[] {
  if (getZodType(schema) !== 'object') {
    return [parseField('input', schema)];
  }

  const def = getZodDef(schema);
  const shape = def.shape;
  const fields: Record<string, ZodSchema> =
    typeof shape === 'function'
      ? (shape as () => Record<string, ZodSchema>)()
      : (shape as Record<string, ZodSchema>);

  if (!fields || typeof fields !== 'object') {
    throw new Error('Invalid Zod object schema: missing shape');
  }

  return Object.entries(fields).map(([name, fieldSchema]) => parseField(name, fieldSchema));
}

function parseField(name: string, schema: ZodSchema): NormalizedParameter {
  let current = schema;
  let isOptional = false;
  let defaultValue: unknown;
  let description = '';

  for (let depth = 0; depth < 10; depth++) {
    if (current.description) {
      description = current.description;
    }

    const type = getZodType(current);
    const def = getZodDef(current);
    const inner = def.innerType as ZodSchema | undefined;

    if (type === 'optional' && inner) {
      isOptional = true;
      current = inner;
    } else if (type === 'default' && inner) {
      isOptional = true;
      const defaultFn = def.defaultValue;
      defaultValue = typeof defaultFn === 'function' ? (defaultFn as () => unknown)() : defaultFn;
      current = inner;
    } else if (type === 'nullable' && inner) {
      isOptional = true;
      current = inner;
    } else {
      break;
    }
  }

  return Object.freeze({
    name,
    type: inferBaseType(current),
    description,
    required: !isOptional,
    default: defaultValue,
  });
}

function inferBaseType(schema: ZodSchema): NormalizedParameter['type'] {
  const type = getZodType(schema);
  const def = getZodDef(schema);

  switch (type) {
    case 'string':
    case 'enum':
      return 'string';
    case 'number': {
      const checks = def.checks as Array<{ isInt?: boolean }> | undefined;
      return checks?.some((c) => c.isInt) ? 'integer' : 'number';
    }
    case 'bigint':
      return 'integer';
    case 'boolean':
      return 'boolean';
    case 'array':
    case 'tuple':
    case 'set':
      return 'array';
    case 'object':
    case 'record':
    case 'map':
      return 'object';
    case 'literal': {
      const val = def.value;
      if (typeof val === 'string') return 'string';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'boolean') return 'boolean';
      return 'any';
    }
    default:
      return 'any';
  }
}

export { z };
