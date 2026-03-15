/**
 * Tool Executor - Executes tool calls and handles results
 */

import type { ToolCallContent, ToolResultContent, Tool } from "../types/index.js"
import { ToolRegistry } from "./registry.js"

export interface ExecutionContext {
  sessionId: string
  messageId: string
  abortSignal?: AbortSignal
}

export interface ExecutionHooks {
  beforeExecute?: (call: ToolCallContent, ctx: ExecutionContext) => Promise<boolean>
  afterExecute?: (call: ToolCallContent, result: ToolResultContent, ctx: ExecutionContext) => Promise<void>
  onError?: (call: ToolCallContent, error: Error, ctx: ExecutionContext) => Promise<void>
}

export class ToolExecutor {
  private hooks: ExecutionHooks = {}

  constructor(
    private registry: ToolRegistry,
    hooks?: ExecutionHooks
  ) {
    if (hooks) {
      this.hooks = hooks
    }
  }

  /**
   * Execute a single tool call
   */
  async execute(
    call: ToolCallContent,
    ctx: ExecutionContext
  ): Promise<ToolResultContent> {
    const tool = this.registry.get(call.name)

    if (!tool) {
      return {
        type: "tool_result",
        toolCallId: call.id,
        result: `Error: Tool not found: ${call.name}`,
        isError: true,
      }
    }

    // Run beforeExecute hook
    if (this.hooks.beforeExecute) {
      const shouldContinue = await this.hooks.beforeExecute(call, ctx)
      if (!shouldContinue) {
        return {
          type: "tool_result",
          toolCallId: call.id,
          result: "Tool execution was cancelled by hook",
          isError: true,
        }
      }
    }

    try {
      // Check for abort signal
      if (ctx.abortSignal?.aborted) {
        return {
          type: "tool_result",
          toolCallId: call.id,
          result: "Tool execution was aborted",
          isError: true,
        }
      }

      const result = await tool.execute(call.arguments)

      const toolResult: ToolResultContent = {
        type: "tool_result",
        toolCallId: call.id,
        result: result.error ? result.error : result.output,
        isError: !!result.error,
      }

      // Run afterExecute hook
      if (this.hooks.afterExecute) {
        await this.hooks.afterExecute(call, toolResult, ctx)
      }

      return toolResult
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Run onError hook
      if (this.hooks.onError) {
        await this.hooks.onError(call, err, ctx)
      }

      return {
        type: "tool_result",
        toolCallId: call.id,
        result: `Error: ${err.message}`,
        isError: true,
      }
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeAll(
    calls: ToolCallContent[],
    ctx: ExecutionContext
  ): Promise<ToolResultContent[]> {
    return Promise.all(calls.map((call) => this.execute(call, ctx)))
  }

  /**
   * Set execution hooks
   */
  setHooks(hooks: ExecutionHooks): void {
    this.hooks = { ...this.hooks, ...hooks }
  }
}

/**
 * Helper function to create a tool
 */
export function createTool(
  name: string,
  description: string,
  parameters: Tool["parameters"],
  execute: Tool["execute"]
): Tool {
  return {
    name,
    description,
    parameters,
    execute,
  }
}
