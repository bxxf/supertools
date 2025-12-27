import { describe, expect, it, mock } from "bun:test";
import { createRelayClient, RelayClient } from "../relay/client";

// Test tools for relay client
const testTools = new Map([
  [
    "get_users",
    {
      name: "get_users",
      description: "Get users",
      parameters: [],
      execute: mock(async () => [{ id: 1 }]),
    },
  ],
  [
    "failing_tool",
    {
      name: "failing_tool",
      description: "A tool that fails",
      parameters: [],
      execute: mock(async () => {
        throw new Error("Tool execution failed");
      }),
    },
  ],
]);

describe("RelayClient", () => {
  describe("constructor", () => {
    it("creates client with required config", () => {
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
      });

      expect(client).toBeInstanceOf(RelayClient);
      expect(client.connected).toBe(false);
    });

    it("accepts optional config", () => {
      const onEvent = mock(() => {});
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
        timeout: 60_000,
        debug: true,
        reconnect: false,
        maxRetries: 3,
        onEvent,
      });

      expect(client).toBeInstanceOf(RelayClient);
    });
  });

  describe("connected", () => {
    it("returns false when not connected", () => {
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
      });

      expect(client.connected).toBe(false);
    });
  });

  describe("waitForResult", () => {
    it("resolves with success when already resolved", async () => {
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
      });

      // Access private state for testing
      (client as any).state.resolved = true;

      const result = await client.waitForResult(1000);
      expect(result.success).toBe(true);
    });

    it("resolves with error when state has error", async () => {
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
      });

      (client as any).state.error = "Test error";

      const result = await client.waitForResult(1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Test error");
    });

    it("times out if no result received", async () => {
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
      });

      const result = await client.waitForResult(50); // Short timeout
      expect(result.success).toBe(false);
      expect(result.error).toBe("Execution timeout");
    });
  });

  describe("disconnect", () => {
    it("handles disconnect when not connected", async () => {
      const client = new RelayClient({
        url: "wss://test.example.com/ws",
        token: "test-token",
        tools: testTools,
      });

      // Should not throw
      await client.disconnect();
    });
  });
});

describe("createRelayClient", () => {
  it("is a factory function for RelayClient", () => {
    const client = createRelayClient({
      url: "wss://test.example.com/ws",
      token: "test-token",
      tools: testTools,
    });

    expect(client).toBeInstanceOf(RelayClient);
  });
});
