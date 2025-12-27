import { describe, expect, it } from "bun:test";
import { decode, encode, isBinary } from "../relay/proto";

describe("Protocol Codec", () => {
  describe("tool_call", () => {
    it("encodes and decodes tool_call message", () => {
      const original = {
        id: "call-123",
        tool: "get_users",
        arguments: { limit: 10, offset: 0 },
      };

      const encoded = encode("tool_call", original);
      const decoded = decode(encoded);

      expect(decoded.type).toBe("tool_call");
      expect(decoded.id).toBe("call-123");
      expect(decoded.tool).toBe("get_users");
      expect(decoded.arguments).toEqual({ limit: 10, offset: 0 });
    });

    it("handles empty arguments", () => {
      const encoded = encode("tool_call", {
        id: "call-456",
        tool: "ping",
        arguments: {},
      });
      const decoded = decode(encoded);

      expect(decoded.type).toBe("tool_call");
      expect(decoded.arguments).toEqual({});
    });

    it("handles complex nested arguments", () => {
      const args = {
        filters: { status: "active", tags: ["a", "b"] },
        options: { deep: { nested: true } },
      };
      const encoded = encode("tool_call", {
        id: "call-789",
        tool: "search",
        arguments: args,
      });
      const decoded = decode(encoded);

      expect(decoded.arguments).toEqual(args);
    });
  });

  describe("tool_result", () => {
    it("encodes and decodes successful result", () => {
      const original = {
        id: "call-123",
        success: true,
        result: { users: [{ id: 1, name: "Alice" }] },
      };

      const encoded = encode("tool_result", original);
      const decoded = decode(encoded);

      expect(decoded.type).toBe("tool_result");
      expect(decoded.id).toBe("call-123");
      expect(decoded.success).toBe(true);
      expect(decoded.result).toEqual({ users: [{ id: 1, name: "Alice" }] });
    });

    it("encodes and decodes failed result", () => {
      const original = {
        id: "call-123",
        success: false,
        error: "User not found",
      };

      const encoded = encode("tool_result", original);
      const decoded = decode(encoded);

      expect(decoded.type).toBe("tool_result");
      expect(decoded.success).toBe(false);
      expect(decoded.error).toBe("User not found");
      expect(decoded.result).toBeUndefined();
    });

    it("handles null result", () => {
      const encoded = encode("tool_result", {
        id: "call-123",
        success: true,
        result: null,
      });
      const decoded = decode(encoded);

      expect(decoded.success).toBe(true);
      expect(decoded.result).toBeNull();
    });
  });

  describe("execute", () => {
    it("encodes and decodes execute message", () => {
      const original = {
        code: 'const result = await mcp.call("host.get_users", {});',
        remoteTools: ["get_users", "get_orders"],
        localTools: { calculate: "async ({ values }) => values.reduce((a, b) => a + b, 0)" },
      };

      const encoded = encode("execute", original);
      const decoded = decode(encoded);

      expect(decoded.type).toBe("execute");
      expect(decoded.code).toBe(original.code);
      expect(decoded.remoteTools).toEqual(["get_users", "get_orders"]);
      expect(decoded.localTools).toEqual(original.localTools);
    });

    it("handles empty tools", () => {
      const encoded = encode("execute", {
        code: "return 42;",
        remoteTools: [],
        localTools: {},
      });
      const decoded = decode(encoded);

      expect(decoded.remoteTools).toEqual([]);
      expect(decoded.localTools).toEqual({});
    });
  });

  describe("result", () => {
    it("encodes and decodes result message", () => {
      const data = { count: 42, items: ["a", "b", "c"] };
      const encoded = encode("result", { data });
      const decoded = decode(encoded);

      expect(decoded.type).toBe("result");
      expect(decoded.data).toEqual(data);
    });

    it("handles primitive result", () => {
      const encoded = encode("result", { data: "simple string" });
      const decoded = decode(encoded);

      expect(decoded.data).toBe("simple string");
    });

    it("handles array result", () => {
      const encoded = encode("result", { data: [1, 2, 3] });
      const decoded = decode(encoded);

      expect(decoded.data).toEqual([1, 2, 3]);
    });
  });

  describe("error", () => {
    it("encodes and decodes error message", () => {
      const original = {
        id: "call-123",
        error: "Something went wrong",
        code: "ERR_TIMEOUT",
      };

      const encoded = encode("error", original);
      const decoded = decode(encoded);

      expect(decoded.type).toBe("error");
      expect(decoded.id).toBe("call-123");
      expect(decoded.error).toBe("Something went wrong");
      expect(decoded.code).toBe("ERR_TIMEOUT");
    });

    it("handles error without id", () => {
      const encoded = encode("error", {
        error: "Fatal error",
      });
      const decoded = decode(encoded);

      expect(decoded.type).toBe("error");
      expect(decoded.id).toBeUndefined();
      expect(decoded.error).toBe("Fatal error");
    });
  });

  describe("ping/pong", () => {
    it("encodes and decodes ping", () => {
      const encoded = encode("ping", { id: "ping-1" });
      const decoded = decode(encoded);

      expect(decoded.type).toBe("ping");
      expect(decoded.id).toBe("ping-1");
    });

    it("encodes and decodes pong", () => {
      const encoded = encode("pong", { id: "ping-1" });
      const decoded = decode(encoded);

      expect(decoded.type).toBe("pong");
      expect(decoded.id).toBe("ping-1");
    });
  });

  describe("isBinary", () => {
    it("returns true for Uint8Array", () => {
      expect(isBinary(new Uint8Array([1, 2, 3]))).toBe(true);
    });

    it("returns true for ArrayBuffer", () => {
      expect(isBinary(new ArrayBuffer(8))).toBe(true);
    });

    it("returns false for non-binary data", () => {
      expect(isBinary("string")).toBe(false);
      expect(isBinary(123)).toBe(false);
      expect(isBinary(null)).toBe(false);
      expect(isBinary(undefined)).toBe(false);
      expect(isBinary({})).toBe(false);
      expect(isBinary([1, 2, 3])).toBe(false);
    });
  });

  describe("decode accepts ArrayBuffer", () => {
    it("decodes from ArrayBuffer", () => {
      const encoded = encode("ping", { id: "test" });
      const arrayBuffer = encoded.buffer.slice(
        encoded.byteOffset,
        encoded.byteOffset + encoded.byteLength
      );

      const decoded = decode(arrayBuffer);

      expect(decoded.type).toBe("ping");
      expect(decoded.id).toBe("test");
    });
  });

  describe("edge cases", () => {
    it("throws on unknown message type", () => {
      expect(() => encode("unknown" as any, {})).toThrow(/unknown message type/i);
    });

    it("handles unicode in arguments", () => {
      const args = { text: "你好世界 🌍 مرحبا" };
      const encoded = encode("tool_call", {
        id: "unicode-test",
        tool: "translate",
        arguments: args,
      });
      const decoded = decode(encoded);

      expect(decoded.arguments).toEqual(args);
    });

    it("handles large payloads", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: "x".repeat(100),
      }));
      const encoded = encode("result", { data: largeArray });
      const decoded = decode(encoded);

      expect((decoded.data as any[]).length).toBe(10000);
    });
  });
});
