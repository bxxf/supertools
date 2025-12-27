/**
 * Protocol Buffer Codec
 *
 * Shared encode/decode for host and sandbox.
 * Generated from relay.proto via `bun run proto`
 */

import { relay } from "./generated.js";

export type MessageType =
  | "tool_call"
  | "tool_result"
  | "execute"
  | "result"
  | "error"
  | "ping"
  | "pong";

export interface DecodedMessage {
  type: MessageType;
  id?: string;
  tool?: string;
  arguments?: Record<string, unknown>;
  success?: boolean;
  result?: unknown;
  error?: string;
  code?: string;
  remoteTools?: string[];
  localTools?: Record<string, string>;
  data?: unknown;
}

function toBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function fromBytes(buffer: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(buffer));
}

export function encode(type: MessageType, payload: Record<string, unknown>): Uint8Array {
  let message: relay.IMessage;

  switch (type) {
    case "tool_call":
      message = {
        toolCall: {
          id: payload.id as string,
          tool: payload.tool as string,
          arguments: toBytes(payload.arguments),
        },
      };
      break;

    case "tool_result":
      message = {
        toolResult: {
          id: payload.id as string,
          success: payload.success as boolean,
          result: payload.result !== undefined ? toBytes(payload.result) : undefined,
          error: payload.error as string | undefined,
        },
      };
      break;

    case "execute":
      message = {
        execute: {
          code: payload.code as string,
          remoteTools: payload.remoteTools as string[],
          localTools: payload.localTools as Record<string, string>,
        },
      };
      break;

    case "result":
      message = { result: { data: toBytes(payload.data) } };
      break;

    case "error":
      message = {
        error: {
          id: payload.id as string | undefined,
          error: payload.error as string,
          code: payload.code as string | undefined,
        },
      };
      break;

    case "ping":
      message = { ping: { id: payload.id as string } };
      break;

    case "pong":
      message = { pong: { id: payload.id as string } };
      break;

    default:
      throw new Error(`Unknown message type: ${type}`);
  }

  return relay.Message.encode(relay.Message.create(message)).finish();
}

export function decode(buffer: Uint8Array | ArrayBuffer): DecodedMessage {
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const msg = relay.Message.decode(data);

  if (msg.toolCall) {
    return {
      type: "tool_call",
      id: msg.toolCall.id ?? "",
      tool: msg.toolCall.tool ?? "",
      arguments: msg.toolCall.arguments
        ? (fromBytes(msg.toolCall.arguments) as Record<string, unknown>)
        : {},
    };
  }

  if (msg.toolResult) {
    return {
      type: "tool_result",
      id: msg.toolResult.id ?? "",
      success: msg.toolResult.success ?? false,
      result: msg.toolResult.result?.length ? fromBytes(msg.toolResult.result) : undefined,
      error: msg.toolResult.error || undefined,
    };
  }

  if (msg.execute) {
    return {
      type: "execute",
      code: msg.execute.code ?? "",
      remoteTools: msg.execute.remoteTools || [],
      localTools: msg.execute.localTools || {},
    };
  }

  if (msg.result) {
    return {
      type: "result",
      data: msg.result.data ? fromBytes(msg.result.data) : undefined,
    };
  }

  if (msg.error) {
    return {
      type: "error",
      id: msg.error.id || undefined,
      error: msg.error.error ?? "",
      code: msg.error.code || undefined,
    };
  }

  if (msg.ping) {
    return { type: "ping", id: msg.ping.id ?? "" };
  }

  if (msg.pong) {
    return { type: "pong", id: msg.pong.id ?? "" };
  }

  throw new Error("Unknown message type");
}

export function isBinary(data: unknown): data is ArrayBuffer | Uint8Array {
  return data instanceof ArrayBuffer || data instanceof Uint8Array;
}
