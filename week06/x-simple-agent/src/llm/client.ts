/**
 * LLM Client - Handles communication with OpenAI-compatible APIs
 *
 * Supports:
 * - OpenAI (default)
 * - DeepSeek
 * - Any OpenAI-compatible API
 */

import OpenAI from "openai"
import type {
  LLMInput,
  LLMOutput,
  LLMEvent,
  Message,
  MessageContent,
  ToolDefinition,
  Usage,
  FinishReason,
} from "../types/index.js"

export type LLMProvider = "openai" | "deepseek" | "custom"

export interface LLMClientConfig {
  apiKey?: string
  baseURL?: string
  organization?: string
  provider?: LLMProvider
}

// Provider presets (for known providers)
export const LLM_PROVIDERS: Record<"openai" | "deepseek", { baseURL: string; envKey: string }> = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
  },
  deepseek: {
    baseURL: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
  },
}

// Type for known provider names
export type KnownProvider = keyof typeof LLM_PROVIDERS

export class LLMClient {
  private client: OpenAI | null = null
  private config: LLMClientConfig
  private provider: LLMProvider

  constructor(config?: LLMClientConfig) {
    this.config = config ?? {}
    this.provider = config?.provider ?? "openai"
  }

  /**
   * Get or create the OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const { apiKey, baseURL } = this.resolveConfig()

      this.client = new OpenAI({
        apiKey,
        baseURL,
        organization: this.config.organization,
      })
    }
    return this.client
  }

  /**
   * Get provider preset if available
   */
  private getProviderPreset(provider: LLMProvider): { baseURL: string; envKey: string } | undefined {
    if (provider in LLM_PROVIDERS) {
      return LLM_PROVIDERS[provider as KnownProvider]
    }
    return undefined
  }

  /**
   * Resolve API key and base URL from config or environment
   */
  private resolveConfig(): { apiKey: string; baseURL?: string } {
    const preset = this.getProviderPreset(this.provider)

    // If apiKey is explicitly provided, use it with configured baseURL
    if (this.config.apiKey) {
      return {
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL ?? preset?.baseURL,
      }
    }

    // Try to get API key from environment based on provider
    if (preset) {
      const apiKey = process.env[preset.envKey]
      if (apiKey) {
        return {
          apiKey,
          baseURL: this.config.baseURL ?? preset.baseURL,
        }
      }
    }

    // Fallback: try OPENAI_API_KEY for any provider
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      return {
        apiKey: openaiKey,
        baseURL: this.config.baseURL ?? preset?.baseURL,
      }
    }

    throw new Error(
      `API key is required. Set ${preset?.envKey ?? "OPENAI_API_KEY"} environment variable or pass apiKey in config.`
    )
  }

  /**
   * Get the current provider
   */
  getProvider(): LLMProvider {
    return this.provider
  }

  /**
   * Convert internal message format to OpenAI format
   */
  private toOpenAIMessages(
    messages: Message[],
    systemPrompt?: string
  ): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = []

    // Add system prompt if provided
    if (systemPrompt) {
      result.push({
        role: "system",
        content: systemPrompt,
      })
    }

    for (const msg of messages) {
      switch (msg.role) {
        case "user": {
          const textContent = msg.content
            .filter((c) => c.type === "text")
            .map((c) => (c as { text: string }).text)
            .join("\n")

          if (textContent) {
            result.push({
              role: "user",
              content: textContent,
            })
          }
          break
        }

        case "assistant": {
          const textParts = msg.content.filter((c) => c.type === "text")
          const toolCalls = msg.content.filter((c) => c.type === "tool_call")

          const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
            role: "assistant",
            content: textParts.length > 0
              ? textParts.map((c) => (c as { text: string }).text).join("\n")
              : null,
            tool_calls: toolCalls.length > 0
              ? toolCalls.map((c) => {
                  const tc = c as { id: string; name: string; arguments: unknown }
                  return {
                    id: tc.id,
                    type: "function" as const,
                    function: {
                      name: tc.name,
                      arguments: typeof tc.arguments === "string"
                        ? tc.arguments
                        : JSON.stringify(tc.arguments),
                    },
                  }
                })
              : undefined,
          }

          result.push(assistantMsg)
          break
        }

        case "tool": {
          for (const c of msg.content) {
            if (c.type === "tool_result") {
              result.push({
                role: "tool",
                tool_call_id: c.toolCallId,
                content: c.result,
              })
            }
          }
          break
        }
      }
    }

    return result
  }

  /**
   * Convert internal tool definitions to OpenAI format
   */
  private toOpenAITools(tools: ToolDefinition[]): OpenAI.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }))
  }

  /**
   * Call LLM with non-streaming response
   */
  async call(input: LLMInput): Promise<LLMOutput> {
    try {
      const response = await this.getClient().chat.completions.create({
        model: input.model,
        messages: this.toOpenAIMessages(input.messages, input.systemPrompt),
        tools: input.tools.length > 0 ? this.toOpenAITools(input.tools) : undefined,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      })

      const choice = response.choices[0]
      const content = this.parseResponseContent(choice)

      return {
        content,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Call LLM with streaming response
   */
  async *stream(input: LLMInput): AsyncGenerator<LLMEvent> {
    try {
      const stream = await this.getClient().chat.completions.create({
        model: input.model,
        messages: this.toOpenAIMessages(input.messages, input.systemPrompt),
        tools: input.tools.length > 0 ? this.toOpenAITools(input.tools) : undefined,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
        stream: true,
      })

      const toolCalls = new Map<string, { id: string; name: string; arguments: string }>()
      let usage: Usage = { inputTokens: 0, outputTokens: 0 }
      let finishReason: FinishReason = "stop"

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        const finish = chunk.choices[0]?.finish_reason

        // Handle text content
        if (delta?.content) {
          yield { type: "text_delta", text: delta.content }
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const id = tc.id ?? ""
            const existing = toolCalls.get(id) ?? { id, name: "", arguments: "" }

            if (tc.function?.name) {
              existing.name = tc.function.name
              yield { type: "tool_call_start", id, name: tc.function.name }
            }

            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments
              yield { type: "tool_call_delta", id, arguments: tc.function.arguments }
            }

            toolCalls.set(id, existing)
          }
        }

        // Handle usage (if available in stream)
        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens,
          }
        }

        // Handle finish
        if (finish) {
          finishReason = this.mapFinishReason(finish)

          // Emit tool_call_end for each completed tool call
          for (const id of toolCalls.keys()) {
            yield { type: "tool_call_end", id }
          }

          yield { type: "finish", reason: finishReason, usage }
        }
      }
    } catch (error) {
      yield { type: "error", error: this.handleError(error) }
    }
  }

  /**
   * Parse OpenAI response content to internal format
   */
  private parseResponseContent(choice: OpenAI.ChatCompletion.Choice): MessageContent[] {
    const content: MessageContent[] = []

    // Add text content
    if (choice.message.content) {
      content.push({
        type: "text",
        text: choice.message.content,
      })
    }

    // Add tool calls
    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        let args: unknown
        try {
          args = JSON.parse(tc.function.arguments)
        } catch {
          args = tc.function.arguments
        }

        content.push({
          type: "tool_call",
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        })
      }
    }

    return content
  }

  /**
   * Map OpenAI finish reason to internal format
   */
  private mapFinishReason(reason: string | null): FinishReason {
    switch (reason) {
      case "stop":
        return "stop"
      case "tool_calls":
        return "tool_calls"
      case "length":
        return "max_tokens"
      default:
        return "stop"
    }
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      return new Error(`OpenAI API Error (${error.status}): ${error.message}`)
    }
    if (error instanceof Error) {
      return error
    }
    return new Error(String(error))
  }
}

// Default client instance
export const defaultClient = new LLMClient()
