import {
  AgentConfig,
  AgentLoopResult,
  AssistantMessage,
  LLMChunk,
  MessagePart,
  ToolResultPart,
  ToolResult,
} from "./types.js";
import { ToolRegistry } from "./tool.js";
import { ToolExecutor } from "./executor.js";
import { ConversationManager } from "./conversation.js";

// ============================================
// Agent Class
// ============================================

export class Agent {
  private config: AgentConfig;
  private toolRegistry: ToolRegistry;
  private conversation: ConversationManager;
  private executor: ToolExecutor;

  constructor(
    config: AgentConfig,
    toolRegistry?: ToolRegistry,
    conversation?: ConversationManager
  ) {
    this.config = config;
    this.toolRegistry = toolRegistry || new ToolRegistry();
    this.conversation = conversation || new ConversationManager();
    this.executor = new ToolExecutor(this.toolRegistry);
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getConversation(): ConversationManager {
    return this.conversation;
  }

  addTool(tool: { id: string; description: string; parameters: any; execute: any }): void {
    this.toolRegistry.register(tool);
  }

  async run(
    userMessage: string,
    abortSignal?: AbortSignal
  ): Promise<AgentLoopResult> {
    // Add user message to conversation
    this.conversation.addUserMessage(userMessage);

    return this.runLoop(abortSignal);
  }

  async runLoop(abortSignal?: AbortSignal): Promise<AgentLoopResult> {
    let step = 0;

    while (step < this.config.maxSteps) {
      // Check for abort
      if (abortSignal?.aborted) {
        return { status: "aborted", stepsCompleted: step };
      }

      step++;

      // Current parts for this assistant message
      const currentParts: MessagePart[] = [];
      const toolCalls: { id: string; name: string; input: Record<string, unknown> }[] = [];

      try {
        // Stream LLM response
        const stream = this.config.provider.stream(
          this.conversation.getMessages(),
          this.toolRegistry.getAll(),
          {
            systemPrompt: this.config.systemPrompt,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            abortSignal,
          }
        );

        let finishReason: LLMChunk["finishReason"] = undefined;

        for await (const chunk of stream) {
          // Check abort during streaming
          if (abortSignal?.aborted) {
            return { status: "aborted", stepsCompleted: step };
          }

          switch (chunk.type) {
            case "text":
              if (chunk.content) {
                // Merge consecutive text parts
                const lastPart = currentParts[currentParts.length - 1];
                if (lastPart && lastPart.type === "text") {
                  (lastPart as any).text += chunk.content;
                } else {
                  currentParts.push({ type: "text", text: chunk.content });
                }
                this.config.onTextDelta?.(chunk.content);
              }
              break;

            case "tool_call":
              if (chunk.toolCall) {
                toolCalls.push({
                  id: chunk.toolCall.id,
                  name: chunk.toolCall.name,
                  input: chunk.toolCall.input,
                });
                currentParts.push({
                  type: "tool_call",
                  id: chunk.toolCall.id,
                  name: chunk.toolCall.name,
                  input: chunk.toolCall.input,
                });
                this.config.onToolCall?.(chunk.toolCall.name, chunk.toolCall.input);
              }
              break;

            case "reasoning":
              if (chunk.content) {
                currentParts.push({ type: "reasoning", text: chunk.content });
              }
              break;

            case "done":
              finishReason = chunk.finishReason;
              break;

            case "error":
              throw new Error(chunk.content || "Unknown LLM error");
          }
        }

        // Check finish reason
        if (finishReason === "stop" || finishReason === "length") {
          // Natural completion - save message and return
          const finalMessage = this.conversation.addAssistantMessage(currentParts);
          return {
            status: finishReason === "stop" ? "completed" : "error",
            finalMessage,
            stepsCompleted: step,
            error:
              finishReason === "length"
                ? new Error("Max tokens reached")
                : undefined,
          };
        }

        // Handle tool calls
        if (finishReason === "tool_calls" && toolCalls.length > 0) {
          // Execute all tool calls
          const toolResults: ToolResultPart[] = await this.executor.executeAll(
            toolCalls,
            {
              sessionId: this.conversation.getSessionId(),
              messageId: `msg_${Date.now()}`,
              abortSignal: abortSignal || new AbortController().signal,
              messages: currentParts,
            },
            this.config.toolTimeout
          );

          // Add tool results to parts
          for (const result of toolResults) {
            currentParts.push(result);
            const tool = this.toolRegistry.get(
              this.getToolNameById(toolCalls, result.toolCallId)
            );
            if (tool) {
              this.config.onToolResult?.(tool.id, {
                title: "",
                output: result.output,
                metadata: { error: result.error },
              });
            }
          }

          // Save assistant message with all parts
          this.conversation.addAssistantMessage(currentParts);

          // Continue loop - LLM will see tool results in next iteration
          continue;
        }

        // No tool calls and no explicit stop - likely completed
        const finalMessage = this.conversation.addAssistantMessage(currentParts);
        return {
          status: "completed",
          finalMessage,
          stepsCompleted: step,
        };
      } catch (error) {
        this.config.onError?.(error as Error);
        return {
          status: "error",
          error: error as Error,
          stepsCompleted: step,
        };
      }
    }

    // Max steps reached
    return {
      status: "max_steps",
      stepsCompleted: step,
    };
  }

  private getToolNameById(
    toolCalls: { id: string; name: string; input: Record<string, unknown> }[],
    id: string
  ): string {
    const tc = toolCalls.find((t) => t.id === id);
    return tc?.name || "";
  }
}

// ============================================
// Agent Factory Function
// ============================================

export function createAgent(
  config: AgentConfig,
  tools?: Array<{ id: string; description: string; parameters: any; execute: any }>
): Agent {
  const agent = new Agent(config);

  if (tools) {
    for (const tool of tools) {
      agent.addTool(tool);
    }
  }

  return agent;
}
