import { ToolContext, ToolResultPart, ToolResult } from "./types.js";
import { ToolRegistry } from "./tool.js";

// ============================================
// Tool Executor
// ============================================

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(
    toolCall: { id: string; name: string; input: Record<string, unknown> },
    context: ToolContext,
    timeout: number = 30000
  ): Promise<ToolResultPart> {
    const tool = this.registry.get(toolCall.name);

    if (!tool) {
      return {
        type: "tool_result",
        toolCallId: toolCall.id,
        output: "",
        error: `Unknown tool: ${toolCall.name}`,
      };
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        tool.execute(toolCall.input, context),
        this.createTimeout(timeout, toolCall.name),
      ]);

      return {
        type: "tool_result",
        toolCallId: toolCall.id,
        output: result.output,
      };
    } catch (error) {
      return {
        type: "tool_result",
        toolCallId: toolCall.id,
        output: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async executeAll(
    toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>,
    context: ToolContext,
    timeout: number = 30000
  ): Promise<ToolResultPart[]> {
    return Promise.all(
      toolCalls.map((tc) => this.execute(tc, context, timeout))
    );
  }

  private createTimeout(ms: number, toolName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool ${toolName} timed out after ${ms}ms`));
      }, ms);
    });
  }
}
