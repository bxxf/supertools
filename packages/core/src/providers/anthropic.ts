/**
 * Anthropic Provider
 *
 * Wraps the Anthropic SDK with programmatic tool execution.
 * Every request generates code that runs in a secure E2B sandbox.
 */

import { ProgrammaticExecutor } from '../executor';
import { normalizeTools, type AnyTool } from '../tool';

import type { LLMAdapter, GeneratedCode } from '../types';
import type { SupertoolsConfig } from '../supertools';

// Minimal type definitions for Anthropic SDK

interface AnthropicClient {
  messages: {
    create(params: MessageCreateParams): Promise<Message>;
  };
}

interface SystemContentBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

interface MessageCreateParams {
  model: string;
  messages: MessageParam[];
  max_tokens: number;
  system?: string | SystemContentBlock[];
  [key: string]: unknown;
}

interface MessageParam {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface Message {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Check if a client is an Anthropic SDK instance
 */
export function isAnthropicClient(client: unknown): client is AnthropicClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'messages' in client &&
    typeof (client as AnthropicClient).messages?.create === 'function'
  );
}

/**
 * Create an LLM adapter from an Anthropic client
 */
function createAnthropicAdapter(client: AnthropicClient, model: string): LLMAdapter {
  return {
    async generateCode(userRequest: string, systemPrompt: string): Promise<GeneratedCode> {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        // Use structured system prompt with cache_control for prompt caching
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userRequest }],
      });

      const textContent = response.content.find((block) => block.type === 'text' && block.text);
      if (!textContent?.text) {
        throw new Error('No text content in response');
      }

      return {
        code: textContent.text,
        rawResponse: JSON.stringify(response),
      };
    },
  };
}

/**
 * Wrap an Anthropic client with programmatic tool execution.
 *
 * Every request is converted to code that executes in a sandbox.
 * This is optimized for tool-heavy workflows with complex logic,
 * loops, and multiple interdependent tool calls.
 */
export function wrapAnthropicClient<T extends AnthropicClient>(
  client: T,
  tools: readonly AnyTool[],
  config: SupertoolsConfig
): T {
  normalizeTools(tools); // Validate tools
  const log = config.debug ? (...args: unknown[]) => console.log('[Supertools]', ...args) : () => {};

  // Create a proxy that intercepts messages.create
  const messagesProxy = new Proxy(client.messages, {
    get(target, prop) {
      if (prop === 'create') {
        return async (params: MessageCreateParams) => {
          // If no tools configured, pass through to original
          if (tools.length === 0) {
            return target.create(params);
          }

          // Extract the last user message as the request
          const lastMessage = params.messages[params.messages.length - 1];
          if (lastMessage?.role !== 'user') {
            return target.create(params);
          }

          const userRequest =
            typeof lastMessage.content === 'string'
              ? lastMessage.content
              : lastMessage.content
                  .filter((block) => block.type === 'text' && block.text)
                  .map((block) => block.text!)
                  .join('\n');

          log('Executing programmatically:', userRequest.slice(0, 100));

          // Create executor and run
          const adapter = createAnthropicAdapter(client, params.model);
          const executor = new ProgrammaticExecutor({
            llm: adapter,
            tools,
            sandbox: config.sandbox,
            instructions: config.instructions,
            debug: config.debug,
            onEvent: config.onEvent,
          });

          const result = await executor.run(userRequest);

          // Return response in Anthropic format
          const response: Message = {
            id: `msg_${Date.now()}`,
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: result.result.success
                  ? result.result.output || 'Task completed successfully.'
                  : `Error: ${result.result.error}`,
              },
            ],
            model: params.model,
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: {
              input_tokens: 0,
              output_tokens: 0,
            },
          };

          // Attach execution metadata for debugging
          Object.defineProperty(response, '_supertools', {
            value: {
              code: result.code,
              explanation: result.explanation,
              executionTimeMs: result.result.executionTimeMs,
            },
            enumerable: false,
          });

          return response;
        };
      }
      return Reflect.get(target, prop);
    },
  });

  // Return a proxy of the client with wrapped messages
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'messages') {
        return messagesProxy;
      }
      return Reflect.get(target, prop);
    },
  }) as T;
}
