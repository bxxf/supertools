/**
 * Relay Module
 * WebSocket communication between host and E2B sandbox.
 */

export type { RelayClientConfig } from "./client";
// Client
export { createRelayClient, RelayClient } from "./client";
export type { DecodedMessage, MessageType } from "./proto";
// Protocol (protobuf)
export { decode, encode, isBinary } from "./proto";
// Config
export type { RelayConfig } from "./types";
export { DEFAULT_RELAY_CONFIG } from "./types";
