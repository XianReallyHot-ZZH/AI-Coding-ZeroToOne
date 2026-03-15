import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import {
  MCPClientInterface,
  MCPToolConfig,
  MCPToolResult,
  Tool,
  ToolContext,
  ToolResult,
} from "../types.js";

// ============================================
// MCP Client Configuration
// ============================================

export interface MCPClientConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// ============================================
// MCP Client Implementation
// ============================================

export class MCPClient implements MCPClientInterface {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const env: Record<string, string> = {};
    // Copy process.env values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    // Merge config env
    if (this.config.env) {
      Object.assign(env, this.config.env);
    }

    this.transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args || [],
      env,
    });

    this.client = new Client(
      { name: this.config.name, version: "1.0.0" },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }

  async listTools(): Promise<MCPToolConfig[]> {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    const response = await this.client.listTools();

    return response.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    const response = await this.client.callTool({
      name,
      arguments: args,
    });

    // Cast response content to handle unknown type
    const content = response.content as Array<{
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
      resource?: { text?: string };
    }>;

    return {
      content: content.map((item) => {
        if (item.type === "text") {
          return { type: "text" as const, text: item.text || "" };
        } else if (item.type === "image") {
          return {
            type: "image" as const,
            data: item.data || "",
            mimeType: item.mimeType,
          };
        } else {
          return {
            type: "resource" as const,
            text: item.resource?.text,
          };
        }
      }),
      isError: response.isError === true,
    };
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// ============================================
// MCP Tool Adapter
// ============================================

export class MCPToolAdapter {
  private mcpClient: MCPClient;
  private tools: Map<string, MCPToolConfig> = new Map();

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  async loadTools(): Promise<void> {
    const toolConfigs = await this.mcpClient.listTools();
    for (const config of toolConfigs) {
      this.tools.set(config.name, config);
    }
  }

  getTool(name: string): Tool | undefined {
    const config = this.tools.get(name);
    if (!config) return undefined;

    // Create a Tool from MCP tool config
    return this.createToolFromConfig(config);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map((config) =>
      this.createToolFromConfig(config)
    );
  }

  private createToolFromConfig(config: MCPToolConfig): Tool {
    // Convert JSON Schema to Zod schema (simplified approach)
    const schema = this.jsonSchemaToZod(config.inputSchema);

    return {
      id: config.name,
      description: config.description || `MCP tool: ${config.name}`,
      parameters: schema,
      execute: async (
        args: Record<string, unknown>,
        context: ToolContext
      ): Promise<ToolResult> => {
        const result = await this.mcpClient.callTool(config.name, args);

        // Extract text content
        const output = result.content
          .map((item) => {
            if (item.type === "text") {
              return item.text || "";
            }
            return "";
          })
          .join("\n");

        if (result.isError) {
          throw new Error(output);
        }

        return {
          title: config.name,
          output,
          metadata: { raw: result.content },
        };
      },
    };
  }

  private jsonSchemaToZod(schema: Record<string, unknown>): z.ZodType {
    // Simplified JSON Schema to Zod conversion
    // For a production implementation, use a library like json-schema-to-zod
    const type = schema.type as string | undefined;

    if (!type) {
      return z.object({}).passthrough();
    }

    switch (type) {
      case "string":
        return z.string();
      case "number":
      case "integer":
        return z.number();
      case "boolean":
        return z.boolean();
      case "array":
        return z.array(z.unknown());
      case "object": {
        const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
        const required = schema.required as string[] | undefined;

        if (!properties) {
          return z.object({}).passthrough();
        }

        const shape: Record<string, z.ZodType> = {};
        for (const [key, prop] of Object.entries(properties)) {
          let propSchema = this.jsonSchemaToZod(prop);
          if (!required?.includes(key)) {
            propSchema = propSchema.optional();
          }
          shape[key] = propSchema;
        }

        return z.object(shape);
      }
      default:
        return z.unknown();
    }
  }
}
