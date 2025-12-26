/**
 * Relay Module
 * WebSocket communication between host and E2B sandbox.
 */

// Config
export type { RelayConfig } from './types';
export { DEFAULT_RELAY_CONFIG } from './types';

// Protocol (protobuf)
export { encode, decode, isBinary } from './proto';
export type { MessageType, DecodedMessage } from './proto';

// Client
export { RelayClient, createRelayClient } from './client';
export type { RelayClientConfig } from './client';
