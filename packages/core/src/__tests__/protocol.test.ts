/**
 * Protocol Validation Tests
 */

import { describe, it, expect } from 'bun:test';
import {
  parseMessage,
  parseToolCall,
  parseToolResult,
  validateOutgoing,
  safeParse,
  ProtocolError,
} from '../relay/utils/protocol';

describe('Protocol Validation', () => {
  describe('parseMessage', () => {
    it('parses valid tool_call', () => {
      const msg = {
        type: 'tool_call',
        id: 'test-123',
        tool: 'get_users',
        arguments: { role: 'admin' },
      };

      const result = parseMessage(msg);
      expect(result).toEqual(msg);
    });

    it('parses valid tool_result', () => {
      const msg = {
        type: 'tool_result',
        id: 'test-123',
        success: true,
        result: [{ id: 1, name: 'Alice' }],
      };

      const result = parseMessage(msg);
      expect(result).toEqual(msg);
    });

    it('parses valid error', () => {
      const msg = {
        type: 'error',
        id: 'test-123',
        error: 'Something went wrong',
        code: 'UNKNOWN_TOOL',
      };

      const result = parseMessage(msg);
      expect(result).toEqual(msg);
    });

    it('parses valid ping/pong', () => {
      expect(parseMessage({ type: 'ping', id: '1' })).toEqual({ type: 'ping', id: '1' });
      expect(parseMessage({ type: 'pong', id: '1' })).toEqual({ type: 'pong', id: '1' });
    });

    it('parses JSON string', () => {
      const msg = { type: 'ping', id: 'test' };
      const result = parseMessage(JSON.stringify(msg));
      expect(result).toEqual(msg);
    });

    it('rejects invalid JSON string', () => {
      expect(() => parseMessage('not json')).toThrow(ProtocolError);
      expect(() => parseMessage('not json')).toThrow(/Invalid JSON/);
    });

    it('rejects unknown message type', () => {
      expect(() => parseMessage({ type: 'unknown', id: '1' })).toThrow(ProtocolError);
    });

    it('rejects missing id', () => {
      expect(() => parseMessage({ type: 'ping' })).toThrow(ProtocolError);
    });

    it('rejects empty id', () => {
      expect(() => parseMessage({ type: 'ping', id: '' })).toThrow(ProtocolError);
    });

    it('rejects id that is too long', () => {
      expect(() => parseMessage({ type: 'ping', id: 'x'.repeat(65) })).toThrow(ProtocolError);
    });
  });

  describe('tool_call validation', () => {
    const validToolCall = {
      type: 'tool_call',
      id: 'test-123',
      tool: 'get_users',
      arguments: {},
    };

    it('accepts valid tool name', () => {
      expect(() => parseMessage({ ...validToolCall, tool: 'myTool' })).not.toThrow();
      expect(() => parseMessage({ ...validToolCall, tool: 'my_tool' })).not.toThrow();
      expect(() => parseMessage({ ...validToolCall, tool: 'tool123' })).not.toThrow();
      expect(() => parseMessage({ ...validToolCall, tool: 'getHTTPResponse' })).not.toThrow();
    });

    it('rejects invalid tool name', () => {
      // Starts with number
      expect(() => parseMessage({ ...validToolCall, tool: '123tool' })).toThrow(ProtocolError);
      // Contains hyphen
      expect(() => parseMessage({ ...validToolCall, tool: 'my-tool' })).toThrow(ProtocolError);
      // Contains space
      expect(() => parseMessage({ ...validToolCall, tool: 'my tool' })).toThrow(ProtocolError);
      // Empty
      expect(() => parseMessage({ ...validToolCall, tool: '' })).toThrow(ProtocolError);
      // Too long
      expect(() => parseMessage({ ...validToolCall, tool: 'a'.repeat(129) })).toThrow(ProtocolError);
    });

    it('rejects non-string tool name', () => {
      expect(() => parseMessage({ ...validToolCall, tool: 123 })).toThrow(ProtocolError);
      expect(() => parseMessage({ ...validToolCall, tool: null })).toThrow(ProtocolError);
    });

    it('accepts empty arguments', () => {
      expect(() => parseMessage({ ...validToolCall, arguments: {} })).not.toThrow();
    });

    it('accepts arguments with various types', () => {
      const args = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { a: { b: 'c' } },
      };
      expect(() => parseMessage({ ...validToolCall, arguments: args })).not.toThrow();
    });

    it('rejects extra fields (strict)', () => {
      expect(() => parseMessage({ ...validToolCall, extra: 'field' })).toThrow(ProtocolError);
    });
  });

  describe('tool_result validation', () => {
    const validResult = {
      type: 'tool_result',
      id: 'test-123',
      success: true,
    };

    it('accepts success with result', () => {
      expect(() => parseMessage({ ...validResult, result: { data: [1, 2] } })).not.toThrow();
    });

    it('accepts failure with error', () => {
      expect(() => parseMessage({ ...validResult, success: false, error: 'Failed' })).not.toThrow();
    });

    it('rejects non-boolean success', () => {
      expect(() => parseMessage({ ...validResult, success: 'true' })).toThrow(ProtocolError);
      expect(() => parseMessage({ ...validResult, success: 1 })).toThrow(ProtocolError);
    });

    it('rejects error that is too long', () => {
      expect(() => parseMessage({ ...validResult, success: false, error: 'x'.repeat(4097) })).toThrow(ProtocolError);
    });
  });

  describe('parseToolCall', () => {
    it('parses valid tool call', () => {
      const msg = {
        type: 'tool_call',
        id: 'test-123',
        tool: 'get_users',
        arguments: { role: 'admin' },
      };

      const result = parseToolCall(msg);
      expect(result.type).toBe('tool_call');
      expect(result.tool).toBe('get_users');
    });

    it('rejects non-tool_call message', () => {
      expect(() => parseToolCall({ type: 'ping', id: '1' })).toThrow(ProtocolError);
      expect(() => parseToolCall({ type: 'ping', id: '1' })).toThrow(/Expected tool_call/);
    });
  });

  describe('parseToolResult', () => {
    it('parses valid tool result', () => {
      const msg = {
        type: 'tool_result',
        id: 'test-123',
        success: true,
        result: 'data',
      };

      const result = parseToolResult(msg);
      expect(result.type).toBe('tool_result');
      expect(result.success).toBe(true);
    });

    it('rejects non-tool_result message', () => {
      expect(() => parseToolResult({ type: 'ping', id: '1' })).toThrow(ProtocolError);
      expect(() => parseToolResult({ type: 'ping', id: '1' })).toThrow(/Expected tool_result/);
    });
  });

  describe('validateOutgoing', () => {
    it('validates correct message', () => {
      expect(() => validateOutgoing({ type: 'pong', id: 'test' })).not.toThrow();
    });

    it('throws on invalid message', () => {
      expect(() => validateOutgoing({ type: 'invalid' })).toThrow(ProtocolError);
    });
  });

  describe('safeParse', () => {
    it('returns success for valid message', () => {
      const result = safeParse({ type: 'ping', id: '1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.type).toBe('ping');
      }
    });

    it('returns error for invalid message', () => {
      const result = safeParse({ type: 'invalid' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(ProtocolError);
      }
    });
  });

  describe('ProtocolError', () => {
    it('includes protocol code', () => {
      const error = new ProtocolError('test', 'INVALID_MESSAGE');
      expect(error.protocolCode).toBe('INVALID_MESSAGE');
      expect(error.code).toBe('PROTOCOL_ERROR');
    });

    it('serializes to JSON', () => {
      const error = new ProtocolError('test message', 'VALIDATION_FAILED');
      const json = error.toJSON();

      expect(json.name).toBe('ProtocolError');
      expect(json.message).toBe('test message');
      expect(json.code).toBe('PROTOCOL_ERROR');
      expect(json.protocolCode).toBe('VALIDATION_FAILED');
    });
  });
});
