import { z } from 'zod';
import { OPTError } from '../../utils/errors';

export type ProtocolErrorCode = 'INVALID_JSON' | 'INVALID_MESSAGE' | 'UNEXPECTED_TYPE';

export class ProtocolError extends OPTError {
  readonly protocolCode: ProtocolErrorCode;
  readonly zodError?: z.ZodError;

  constructor(message: string, code: ProtocolErrorCode, zodError?: z.ZodError) {
    super(message, 'PROTOCOL_ERROR');
    this.name = 'ProtocolError';
    this.protocolCode = code;
    this.zodError = zodError;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      protocolCode: this.protocolCode,
      issues: this.zodError?.issues,
    };
  }
}

const messageId = z.string().min(1).max(64);
const toolName = z.string().min(1).max(128).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Invalid tool name format');

export const toolCallSchema = z.object({
  type: z.literal('tool_call'),
  id: messageId,
  tool: toolName,
  arguments: z.record(z.string(), z.unknown()),
}).strict();

export const toolResultSchema = z.object({
  type: z.literal('tool_result'),
  id: messageId,
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().max(4096).optional(),
}).strict();

export const errorSchema = z.object({
  type: z.literal('error'),
  id: messageId,
  error: z.string().min(1).max(4096),
  code: z.string().max(64).optional(),
}).strict();

export const pingSchema = z.object({ type: z.literal('ping'), id: messageId }).strict();
export const pongSchema = z.object({ type: z.literal('pong'), id: messageId }).strict();

export const resultSchema = z.object({
  type: z.literal('result'),
  data: z.unknown(),
}).strict();

export const messageSchema = z.discriminatedUnion('type', [
  toolCallSchema,
  toolResultSchema,
  errorSchema,
  pingSchema,
  pongSchema,
  resultSchema,
]);

export type ToolCallMessage = z.infer<typeof toolCallSchema>;
export type ToolResultMessage = z.infer<typeof toolResultSchema>;
export type ErrorMessage = z.infer<typeof errorSchema>;
export type PingMessage = z.infer<typeof pingSchema>;
export type PongMessage = z.infer<typeof pongSchema>;
export type ResultMessage = z.infer<typeof resultSchema>;
export type Message = z.infer<typeof messageSchema>;

export function parseMessage(input: unknown): Message {
  const data = typeof input === 'string' ? parseJson(input) : input;
  const result = messageSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ProtocolError(
      `Invalid message: ${issue?.message ?? 'validation failed'}`,
      'INVALID_MESSAGE',
      result.error
    );
  }
  return result.data;
}

export function parseToolCall(input: unknown): ToolCallMessage {
  const message = parseMessage(input);
  if (message.type !== 'tool_call') {
    throw new ProtocolError(`Expected tool_call, got ${message.type}`, 'UNEXPECTED_TYPE');
  }
  return message;
}

export function parseToolResult(input: unknown): ToolResultMessage {
  const message = parseMessage(input);
  if (message.type !== 'tool_result') {
    throw new ProtocolError(`Expected tool_result, got ${message.type}`, 'UNEXPECTED_TYPE');
  }
  return message;
}

export function validateOutgoing(message: unknown): void {
  parseMessage(message);
}

export function safeParse(input: unknown): { ok: true; data: Message } | { ok: false; error: ProtocolError } {
  try {
    return { ok: true, data: parseMessage(input) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ProtocolError ? error : new ProtocolError(String(error), 'INVALID_MESSAGE'),
    };
  }
}

function parseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    throw new ProtocolError('Invalid JSON', 'INVALID_JSON');
  }
}
