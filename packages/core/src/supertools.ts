/**
 * Supertools
 *
 * Wrap any LLM SDK client with programmatic tool calling.
 * Auto-detects the provider and applies the appropriate wrapper.
 *
 * @example
 * ```ts
 * import { supertools, defineTool, z } from '@supertools-ai/core';
 * import { Sandbox } from '@e2b/code-interpreter';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const tools = [
 *   defineTool({
 *     name: 'queryDatabase',
 *     description: 'Execute a SQL query',
 *     parameters: z.object({ sql: z.string() }),
 *     returns: z.array(z.record(z.any())),
 *     execute: async ({ sql }) => db.query(sql),
 *   }),
 * ];
 *
 * const sandbox = await Sandbox.create('supertools-bun');
 * const client = supertools(new Anthropic(), { tools, sandbox });
 *
 * // Use exactly like the normal SDK
 * const response = await client.messages.create({
 *   model: 'claude-haiku-4-5-20251001',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Query all users and summarize' }],
 * });
 * ```
 */

import type { Sandbox } from '@e2b/code-interpreter';
import type { AnyTool } from './tool';
import type { ExecutionEvent } from './types';
import { isAnthropicClient, wrapAnthropicClient } from './providers/anthropic';
import { ConfigurationError } from './utils/errors';

/**
 * Configuration options for supertools
 */
export interface SupertoolsConfig {
  /** Tools to make available */
  readonly tools: readonly AnyTool[];
  /** Pre-created E2B sandbox - caller manages lifecycle */
  readonly sandbox: Sandbox;
  /** Additional instructions for the LLM */
  readonly instructions?: string;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Callback for structured execution events */
  readonly onEvent?: (event: ExecutionEvent) => void;
}

/**
 * Supported provider types
 */
export type SupportedProvider = 'anthropic';

/**
 * Detect the provider type from a client instance
 */
export function detectProvider(client: unknown): SupportedProvider | null {
  if (isAnthropicClient(client)) {
    return 'anthropic';
  }
  return null;
}

/**
 * Wrap an LLM SDK client with programmatic tool calling.
 *
 * The wrapper intercepts API calls and automatically generates code
 * that runs all tool calls in a secure sandbox, returning results
 * in the expected SDK format.
 *
 * @param client - An LLM SDK client (Anthropic, OpenAI, etc.)
 * @param config - Configuration including tools to make available
 * @returns A wrapped client that behaves like the original
 *
 * @example
 * ```ts
 * const sandbox = await Sandbox.create('supertools-bun');
 * const client = supertools(new Anthropic(), {
 *   tools: [queryDb, sendEmail],
 *   sandbox,
 *   debug: true,
 * });
 *
 * // Works exactly like the normal Anthropic SDK
 * const response = await client.messages.create({
 *   model: 'claude-haiku-4-5-20251001',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Find top users and email report' }],
 * });
 * ```
 */
export function supertools<T>(client: T, config: SupertoolsConfig): T {
  const provider = detectProvider(client);

  if (!provider) {
    throw new ConfigurationError(
      'Unsupported LLM client. Currently supported: Anthropic SDK. ' +
        'OpenAI and AI SDK support coming soon.'
    );
  }

  if (!config.tools || !Array.isArray(config.tools)) {
    throw new ConfigurationError('tools must be an array of Tool definitions');
  }

  if (!config.sandbox) {
    throw new ConfigurationError('sandbox is required - create one with Sandbox.create()');
  }

  switch (provider) {
    case 'anthropic':
      // Type is already validated by detectProvider
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return wrapAnthropicClient(client as any, config.tools, config) as T;

    default:
      throw new ConfigurationError(`Unknown provider: ${provider}`);
  }
}

export default supertools;
