/**
 * Relay Module
 * WebSocket communication between host and E2B sandbox.
 */

// Config
export type { RelayConfig } from './types';
export { DEFAULT_RELAY_CONFIG } from './types';

// Protocol validation and types
export {
  parseMessage,
  parseToolCall,
  parseToolResult,
  validateOutgoing,
  safeParse,
  ProtocolError,
} from './utils/protocol';
export type {
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
  PingMessage,
  PongMessage,
  ResultMessage,
  Message,
} from './utils/protocol';

// Client
export { RelayClient, createRelayClient } from './client';
export type { RelayClientConfig } from './client';
