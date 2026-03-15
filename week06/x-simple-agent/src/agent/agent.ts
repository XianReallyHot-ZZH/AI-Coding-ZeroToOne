/**
 * Agent - Core agent implementation with tool calling loop
 */

import { v4 as uuidv4 } from "uuid"
import type {
  AgentConfig,
  AgentEvent,
  Message,
  MessageContent,
  ToolCallContent,
  ToolResultContent,
  FinishReason,
  Tool,
} from "../types/index.js"
import { LLMClient, type LLMProvider } from "../llm/index.js"
import { ToolRegistry, ToolExecutor, createTool } from "../tool/index.js"
import { SessionManager } from "../session/index.js"
import type { Session } from "../types/index.js"

export interface AgentOptions extends Partial<AgentConfig> {
  llmClient?: LLMClient
  model?: string
  provider?: LLMProvider
  apiKey?: string
  baseURL?: string
}

export class Agent {
  private registry: ToolRegistry
  private executor: ToolExecutor
  private llm: LLMClient
  private config: AgentConfig
  private session: Session

  constructor(options: AgentOptions = {}) {
    this.config = {
      model: options.model ?? (options.provider === "deepseek" ? "deepseek-chat" : "gpt-4o"),
      systemPrompt: options.systemPrompt,
      tools: options.tools ?? [],
      maxSteps: options.maxSteps ?? 200,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    }

    this.registry = new ToolRegistry()
    this.executor = new ToolExecutor(this.registry)

    // Create LLM client with provider support
    this.llm = options.llmClient ?? new LLMClient({
      provider: options.provider,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    })

    // Register initial tools
    if (this.config.tools) {
      this.registry.registerAll(this.config.tools)
    }

    // Create session
    this.session = SessionManager.create({
      systemPrompt: this.config.systemPrompt,
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      tools: this.config.tools,
    })
  }

  /**
   * Get the current session
   */
  getSession(): Session {
    return this.session
  }

  /**
   * Get the tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.registry
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    this.registry.register(tool)
    this.session.tools.push(tool)
  }

  /**
   * Register multiple tools
   */
  registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      this.registerTool(tool)
    }
  }

  /**
   * Add a custom tool with a simpler interface
   */
  addTool(
    name: string,
    description: string,
    parameters: Tool["parameters"],
    handler: (args: unknown) => Promise<string | { output: string; error?: string }>
  ): void {
    const tool = createTool(name, description, parameters, async (args) => {
      const result = await handler(args)
      if (typeof result === "string") {
        return { output: result }
      }
      return result
    })
    this.registerTool(tool)
  }

  /**
   * Clear the conversation history
   */
  clearHistory(): void {
    SessionManager.clearMessages(this.session)
  }

  /**
   * Run the agent with a user message (non-streaming)
   */
  async run(userMessage: string): Promise<Message[]> {
    // Add user message
    SessionManager.addUserMessage(this.session, userMessage)
    SessionManager.setStatus(this.session, "running")

    const maxSteps = this.config.maxSteps ?? 200
    let step = 0

    try {
      while (step < maxSteps) {
        step++

        // Call LLM
        const response = await this.llm.call({
          model: this.config.model,
          messages: this.session.messages,
          systemPrompt: this.config.systemPrompt,
          tools: this.registry.toToolDefinitions(),
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        })

        // Add assistant message
        SessionManager.addAssistantMessage(this.session, response.content)

        // Check for tool calls
        const toolCalls = response.content.filter(
          (c): c is ToolCallContent => c.type === "tool_call"
        )

        if (toolCalls.length === 0) {
          // No tool calls, we're done
          SessionManager.setStatus(this.session, "completed")
          break
        }

        // Execute tools in parallel
        const results = await this.executor.executeAll(toolCalls, {
          sessionId: this.session.id,
          messageId: uuidv4(),
        })

        // Add tool results
        SessionManager.addToolMessage(this.session, results)
      }

      if (step >= maxSteps) {
        SessionManager.setStatus(this.session, "error")
        throw new Error(`Agent exceeded maximum steps (${maxSteps})`)
      }

      return this.session.messages
    } catch (error) {
      SessionManager.setStatus(this.session, "error")
      throw error
    }
  }

  /**
   * Run the agent with streaming output
   */
  async *stream(userMessage: string): AsyncGenerator<AgentEvent> {
    // Add user message
    SessionManager.addUserMessage(this.session, userMessage)
    SessionManager.setStatus(this.session, "running")

    const maxSteps = this.config.maxSteps ?? 200
    let step = 0

    try {
      while (step < maxSteps) {
        step++
        yield { type: "step_start", step }

        // Stream LLM response
        const content: MessageContent[] = []
        const toolCalls: ToolCallContent[] = []
        let finishReason: FinishReason = "stop"
        let usage = { inputTokens: 0, outputTokens: 0 }

        yield { type: "message_start", role: "assistant" }

        for await (const event of this.llm.stream({
          model: this.config.model,
          messages: this.session.messages,
          systemPrompt: this.config.systemPrompt,
          tools: this.registry.toToolDefinitions(),
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        })) {
          switch (event.type) {
            case "text_delta":
              yield { type: "text", text: event.text }
              // Accumulate text content
              const lastText = content.findLast((c: MessageContent) => c.type === "text")
              if (lastText && lastText.type === "text") {
                lastText.text += event.text
              } else {
                content.push({ type: "text", text: event.text })
              }
              break

            case "tool_call_start":
              // Start accumulating a new tool call
              toolCalls.push({
                type: "tool_call",
                id: event.id || `tc_${toolCalls.length}`,
                name: event.name,
                arguments: "",
              })
              break

            case "tool_call_delta":
              // Accumulate tool call arguments
              // When id is empty, use the last tool call
              let tc = toolCalls.find((t) => t.id === event.id)
              if (!tc && (!event.id || event.id === "")) {
                // Fall back to last tool call
                tc = toolCalls[toolCalls.length - 1]
              }
              if (tc) {
                (tc.arguments as string) += event.arguments
              }
              break

            case "tool_call_end":
              // Parse arguments and emit event
              // When id is empty, find by index (last completed tool call)
              let completedTc = toolCalls.find((t) => t.id === event.id)
              if (!completedTc && (!event.id || event.id === "")) {
                // Find the last tool call that hasn't been added to content yet
                completedTc = toolCalls.filter((t) => !content.includes(t)).pop()
              }
              if (completedTc) {
                try {
                  completedTc.arguments = JSON.parse(completedTc.arguments as string)
                } catch {
                  // Keep as string if not valid JSON
                }
                content.push(completedTc)
                yield {
                  type: "tool_call",
                  id: completedTc.id,
                  name: completedTc.name,
                  args: completedTc.arguments,
                }
              }
              break

            case "finish":
              finishReason = event.reason
              usage = event.usage
              break

            case "error":
              yield { type: "error", error: event.error }
              SessionManager.setStatus(this.session, "error")
              return
          }
        }

        yield { type: "message_end", finishReason }

        // Save assistant message
        SessionManager.addAssistantMessage(this.session, content)

        // No tool calls means we're done
        if (toolCalls.length === 0) {
          SessionManager.setStatus(this.session, "completed")
          yield { type: "step_end", step }
          break
        }

        // Execute tools
        const results: ToolResultContent[] = []
        for (const call of toolCalls) {
          const result = await this.executor.execute(call, {
            sessionId: this.session.id,
            messageId: uuidv4(),
          })
          results.push(result)
          yield {
            type: "tool_result",
            id: call.id,
            name: call.name,
            result: result.result,
            isError: result.isError,
          }
        }

        // Save tool results
        SessionManager.addToolMessage(this.session, results)

        yield { type: "step_end", step }
      }

      if (step >= maxSteps) {
        SessionManager.setStatus(this.session, "error")
        yield {
          type: "error",
          error: new Error(`Agent exceeded maximum steps (${maxSteps})`),
        }
      }
    } catch (error) {
      SessionManager.setStatus(this.session, "error")
      yield {
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /**
   * Get the last assistant message content as text
   */
  getLastResponse(): string | undefined {
    const messages = [...this.session.messages].reverse()
    for (const msg of messages) {
      if (msg.role === "assistant") {
        const textContent = msg.content.find((c) => c.type === "text")
        if (textContent && textContent.type === "text") {
          return textContent.text
        }
      }
    }
    return undefined
  }
}

/**
 * Create a new agent with the given configuration
 */
export function createAgent(options: AgentOptions = {}): Agent {
  return new Agent(options)
}
