/**
 * Tool Registry - Manages all available tools
 */

import type { Tool, ToolDefinition } from "../types/index.js"

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * List all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get all tool names
   */
  names(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * Convert all tools to LLM tool definitions format
   */
  toToolDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * Get the number of registered tools
   */
  get size(): number {
    return this.tools.size
  }
}

// Global default registry
export const globalRegistry = new ToolRegistry()
