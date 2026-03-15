/**
 * MCP Client - Model Context Protocol integration
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import type { Tool, ToolResult, MCPConfig, JSONSchema } from "../types/index.js"

export interface MCPToolDefinition {
  name: string
  description?: string
  inputSchema: JSONSchema
}

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private connected = false
  private config: MCPConfig | null = null

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPConfig): Promise<void> {
    if (this.connected) {
      await this.disconnect()
    }

    this.config = config

    if (config.type === "stdio") {
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...process.env,
          ...config.env,
        } as Record<string, string>,
      })

      this.client = new Client(
        { name: "simple-agent-mcp", version: "1.0.0" },
        { capabilities: {} }
      )

      await this.client.connect(this.transport)
      this.connected = true
    } else {
      throw new Error(`Unsupported MCP transport type: ${config.type}`)
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close()
      this.transport = null
    }
    this.client = null
    this.connected = false
  }

  /**
   * Check if connected to an MCP server
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * List all tools available from the MCP server
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server")
    }

    const response = await this.client.listTools()

    return response.tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema as JSONSchema,
    }))
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: unknown): Promise<ToolResult> {
    if (!this.client || !this.connected) {
      throw new Error("Not connected to MCP server")
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: args as Record<string, unknown>,
      })

      // Extract text content from response
      let output = ""
      if (response.content && Array.isArray(response.content)) {
        for (const item of response.content) {
          if (item.type === "text") {
            output += (item as { text: string }).text
          }
        }
      }

      return {
        output,
        metadata: response.meta as Record<string, unknown> | undefined,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      return {
        output: "",
        error: err.message,
      }
    }
  }

  /**
   * Get the server name from config
   */
  getServerName(): string {
    return this.config?.name ?? "unknown"
  }
}

/**
 * Adapt an MCP tool to the internal Tool interface
 */
export function adaptMCPTool(client: MCPClient, mcpTool: MCPToolDefinition): Tool {
  return {
    name: mcpTool.name,
    description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
    parameters: mcpTool.inputSchema,
    execute: async (args: unknown) => {
      return await client.callTool(mcpTool.name, args)
    },
  }
}

/**
 * Load all tools from an MCP client and return them as Tool instances
 */
export async function loadMCPTools(client: MCPClient): Promise<Tool[]> {
  const mcpTools = await client.listTools()
  return mcpTools.map((tool) => adaptMCPTool(client, tool))
}
