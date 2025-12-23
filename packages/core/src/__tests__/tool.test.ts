/**
 * Tool Module Tests
 */

import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { defineTool, normalizeTools, isTool } from '../tool';

describe('Tool Module', () => {
  describe('defineTool', () => {
    it('creates a tool with schema parameters', () => {
      const tool = defineTool({
        name: 'get_users',
        description: 'Get users from database',
        parameters: z.object({
          role: z.string().optional(),
          limit: z.number().default(10),
        }),
        execute: async ({ role, limit }) => {
          return { role, limit };
        },
      });

      expect(isTool(tool)).toBe(true);
      expect(tool.name).toBe('get_users');
      expect(tool.description).toBe('Get users from database');
    });

    it('creates a tool with empty parameters', () => {
      const tool = defineTool({
        name: 'ping',
        description: 'Ping the server',
        parameters: z.object({}),
        execute: async () => 'pong',
      });

      expect(isTool(tool)).toBe(true);
      expect(tool.name).toBe('ping');
    });

    it('throws on invalid name', () => {
      expect(() =>
        defineTool({
          name: '123invalid',
          description: 'A valid description',
          parameters: z.object({}),
          execute: async () => {},
        })
      ).toThrow(/Invalid tool name/);

      expect(() =>
        defineTool({
          name: 'has-hyphen',
          description: 'A valid description',
          parameters: z.object({}),
          execute: async () => {},
        })
      ).toThrow(/Invalid tool name/);

      expect(() =>
        defineTool({
          name: '',
          description: 'A valid description',
          parameters: z.object({}),
          execute: async () => {},
        })
      ).toThrow(/Tool name is required/);
    });

    it('throws on missing description', () => {
      expect(() =>
        defineTool({
          name: 'test_tool',
          description: '',
          parameters: z.object({}),
          execute: async () => {},
        })
      ).toThrow(/description is required/);
    });

    it('throws on non-function execute', () => {
      expect(() =>
        defineTool({
          name: 'test_tool',
          description: 'A valid description',
          parameters: z.object({}),
          execute: 'not a function' as any,
        })
      ).toThrow(/execute must be a function/);
    });

    it('throws on non-object parameters', () => {
      expect(() =>
        defineTool({
          name: 'test_tool',
          description: 'A valid description',
          parameters: z.string() as any,
          execute: async () => {},
        })
      ).toThrow(/must be z\.object/);
    });
  });

  describe('normalizeTools', () => {
    it('normalizes a defined tool', () => {
      const tool = defineTool({
        name: 'getUsers',
        description: 'Get users from the database',
        parameters: z.object({
          role: z.string(),
        }),
        execute: async ({ role }) => [{ role }],
      });

      const [normalized] = normalizeTools([tool]);

      expect(normalized.name).toBe('get_users'); // camelCase -> snake_case
      expect(normalized.description).toBe('Get users from the database');
      expect(normalized.parameters).toHaveLength(1);
      expect(normalized.parameters[0].name).toBe('role');
      expect(normalized.parameters[0].type).toBe('string');
      expect(normalized.parameters[0].required).toBe(true);
    });

    it('converts camelCase to snake_case', () => {
      const tool = defineTool({
        name: 'getUserById',
        description: 'Get a user by their ID',
        parameters: z.object({}),
        execute: async () => {},
      });

      expect(normalizeTools([tool])[0].name).toBe('get_user_by_id');
    });

    it('handles consecutive uppercase (HTTP, API, etc)', () => {
      const tool = defineTool({
        name: 'getHTTPResponse',
        description: 'Get HTTP response from server',
        parameters: z.object({}),
        execute: async () => {},
      });

      expect(normalizeTools([tool])[0].name).toBe('get_http_response');
    });

    it('handles optional parameters', () => {
      const tool = defineTool({
        name: 'test_tool',
        description: 'A test tool with parameters',
        parameters: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        execute: async () => {},
      });

      const [normalized] = normalizeTools([tool]);
      const required = normalized.parameters.find(p => p.name === 'required');
      const optional = normalized.parameters.find(p => p.name === 'optional');

      expect(required?.required).toBe(true);
      expect(optional?.required).toBe(false);
    });

    it('maps Zod types to Python types', () => {
      const tool = defineTool({
        name: 'test_tool',
        description: 'A test tool with various types',
        parameters: z.object({
          str: z.string(),
          num: z.number(),
          int: z.number().int(),
          bool: z.boolean(),
          arr: z.array(z.string()),
          obj: z.object({ nested: z.string() }),
        }),
        execute: async () => {},
      });

      const [normalized] = normalizeTools([tool]);
      const params = Object.fromEntries(normalized.parameters.map(p => [p.name, p.type]));

      expect(params.str).toBe('string');
      expect(params.num).toBe('number');
      expect(params.int).toBe('integer');
      expect(params.bool).toBe('boolean');
      expect(params.arr).toBe('array');
      expect(params.obj).toBe('object');
    });

    it('includes parameter descriptions', () => {
      const tool = defineTool({
        name: 'test_tool',
        description: 'A test tool with descriptions',
        parameters: z.object({
          role: z.string().describe('The user role'),
        }),
        execute: async () => {},
      });

      const [normalized] = normalizeTools([tool]);
      expect(normalized.parameters[0].description).toBe('The user role');
    });
  });

  describe('isTool', () => {
    it('returns true for defined tools', () => {
      const tool = defineTool({
        name: 'test_tool',
        description: 'A simple test tool',
        parameters: z.object({}),
        execute: async () => {},
      });

      expect(isTool(tool)).toBe(true);
    });

    it('returns false for non-tools', () => {
      expect(isTool({})).toBe(false);
      expect(isTool(null)).toBe(false);
      expect(isTool(undefined)).toBe(false);
      expect(isTool({ name: 'fake', execute: () => {} })).toBe(false);
    });
  });
});
