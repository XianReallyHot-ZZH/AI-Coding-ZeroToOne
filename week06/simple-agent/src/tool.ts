import { z, ZodError } from "zod";
import { Tool, ToolContext, ToolResult } from "./types.js";

// ============================================
// Tool Definition Helper
// ============================================

export interface DefineToolConfig<TSchema extends z.ZodType> {
  description: string;
  parameters: TSchema;
  execute: (args: z.infer<TSchema>, context: ToolContext) => Promise<ToolResult>;
  formatValidationError?: (error: ZodError) => string;
}

export function defineTool<TSchema extends z.ZodType>(
  id: string,
  config: DefineToolConfig<TSchema>
): Tool<TSchema> {
  return {
    id,
    description: config.description,
    parameters: config.parameters,
    execute: async (args: unknown, context: ToolContext) => {
      // Validate input against schema
      const result = config.parameters.safeParse(args);
      if (!result.success) {
        const errorMsg = config.formatValidationError
          ? config.formatValidationError(result.error)
          : `Invalid arguments for ${id}: ${result.error.message}`;
        throw new Error(errorMsg);
      }
      return config.execute(result.data, context);
    },
  };
}

// ============================================
// Tool Registry
// ============================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool already registered: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  remove(id: string): boolean {
    return this.tools.delete(id);
  }

  clear(): void {
    this.tools.clear();
  }
}
