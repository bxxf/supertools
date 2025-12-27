import { describe, expect, it, mock } from "bun:test";
import { isAnthropicClient } from "../providers/anthropic";

describe("isAnthropicClient", () => {
  it("returns true for valid Anthropic client structure", () => {
    const mockClient = {
      messages: {
        create: mock(async () => ({})),
      },
    };

    expect(isAnthropicClient(mockClient)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isAnthropicClient(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAnthropicClient(undefined)).toBe(false);
  });

  it("returns false for primitive values", () => {
    expect(isAnthropicClient("string")).toBe(false);
    expect(isAnthropicClient(123)).toBe(false);
    expect(isAnthropicClient(true)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isAnthropicClient({})).toBe(false);
  });

  it("returns false for object without messages", () => {
    expect(isAnthropicClient({ other: "prop" })).toBe(false);
  });

  it("returns false for object with messages but no create", () => {
    expect(isAnthropicClient({ messages: {} })).toBe(false);
    expect(isAnthropicClient({ messages: { other: "method" } })).toBe(false);
  });

  it("returns false for object with messages.create not a function", () => {
    expect(isAnthropicClient({ messages: { create: "not a function" } })).toBe(false);
    expect(isAnthropicClient({ messages: { create: null } })).toBe(false);
  });

  it("returns true for object with additional properties", () => {
    const mockClient = {
      messages: {
        create: mock(async () => ({})),
        stream: mock(async () => ({})),
      },
      beta: {},
      apiKey: "test",
    };

    expect(isAnthropicClient(mockClient)).toBe(true);
  });
});
