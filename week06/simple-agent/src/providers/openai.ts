import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  LLMProvider,
  LLMChunk,
  LLMStreamOptions,
  Message,
  UserMessage,
  AssistantMessage,
  Tool,
} from "../types.js";

// ============================================
// OpenAI Provider Configuration
// ============================================

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

// ============================================
// OpenAI Provider Implementation
// ============================================

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL,
    });
    this.model = config.model || "gpt-4o";
  }

  async *stream(
    messages: Message[],
    tools: Tool[],
    options?: LLMStreamOptions
  ): AsyncIterable<LLMChunk> {
    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (options?.systemPrompt) {
      openaiMessages.push({
        role: "system",
        content: options.systemPrompt,
      });
    }

    // Convert conversation messages
    for (const msg of messages) {
      if (msg.role === "user") {
        openaiMessages.push({
          role: "user",
          content: msg.content,
        });
      } else {
        // Assistant message - convert parts to OpenAI format
        const assistantMsg = msg as AssistantMessage;
        const content: string | null = this.extractTextFromParts(assistantMsg.parts);
        const toolCalls = this.extractToolCallsFromParts(assistantMsg.parts);

        openaiMessages.push({
          role: "assistant",
          content,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        });

        // Add tool results
        for (const part of assistantMsg.parts) {
          if (part.type === "tool_result") {
            openaiMessages.push({
              role: "tool",
              tool_call_id: part.toolCallId,
              content: part.error || part.output,
            });
          }
        }
      }
    }

    // Convert tools to OpenAI format
    const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters, {
          target: "openApi3",
        }) as Record<string, unknown>,
      },
    }));

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: openaiMessages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          stream: true,
        },
        {
          signal: options?.abortSignal,
        }
      );

      let currentToolCalls: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        // Handle text content
        if (delta?.content) {
          yield {
            type: "text",
            content: delta.content,
          };
        }

        // Handle tool calls (streaming)
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index;

            if (!currentToolCalls.has(index)) {
              currentToolCalls.set(index, {
                id: toolCallDelta.id || "",
                name: "",
                arguments: "",
              });
            }

            const current = currentToolCalls.get(index)!;
            if (toolCallDelta.id) {
              current.id = toolCallDelta.id;
            }
            if (toolCallDelta.function?.name) {
              current.name = toolCallDelta.function.name;
            }
            if (toolCallDelta.function?.arguments) {
              current.arguments += toolCallDelta.function.arguments;
            }
          }
        }

        // Handle finish reason
        if (finishReason) {
          // Yield any pending tool calls
          if (finishReason === "tool_calls" && currentToolCalls.size > 0) {
            for (const [, toolCall] of currentToolCalls) {
              let input: Record<string, unknown> = {};
              try {
                input = JSON.parse(toolCall.arguments);
              } catch {
                // Keep empty object if parse fails
              }

              yield {
                type: "tool_call",
                toolCall: {
                  id: toolCall.id,
                  name: toolCall.name,
                  input,
                },
              };
            }
          }

          yield {
            type: "done",
            finishReason: this.mapFinishReason(finishReason),
          };
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        yield {
          type: "error",
          content: error.message,
        };
      } else {
        yield {
          type: "error",
          content: "Unknown error occurred",
        };
      }
    }
  }

  private extractTextFromParts(parts: MessagePart[]): string | null {
    const textParts = parts.filter((p) => p.type === "text");
    if (textParts.length === 0) return null;
    return textParts.map((p) => (p as { text: string }).text).join("");
  }

  private extractToolCallsFromParts(
    parts: MessagePart[]
  ): OpenAI.ChatCompletionMessageToolCall[] {
    const toolCallParts = parts.filter((p) => p.type === "tool_call");
    return toolCallParts.map((p) => {
      const tc = p as { id: string; name: string; input: Record<string, unknown> };
      return {
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.input),
        },
      };
    });
  }

  private mapFinishReason(
    reason: string
  ): "stop" | "tool_calls" | "error" | "length" | undefined {
    switch (reason) {
      case "stop":
        return "stop";
      case "tool_calls":
        return "tool_calls";
      case "length":
        return "length";
      case "content_filter":
        return "error";
      default:
        return undefined;
    }
  }
}

// Type import for MessagePart
import { MessagePart } from "../types.js";
