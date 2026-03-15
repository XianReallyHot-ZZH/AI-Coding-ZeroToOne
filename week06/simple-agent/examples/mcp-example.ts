/**
 * MCP Integration Example
 *
 * Demonstrates how to create an agent with MCP (Model Context Protocol) tools
 * This example uses a simple filesystem MCP server
 */

import { z } from "zod";
import {
  Agent,
  OpenAIProvider,
  defineTool,
  ToolRegistry,
  MCPClient,
  MCPToolAdapter,
} from "../src/index.js";

async function main() {
  console.log("=== MCP Integration Example ===\n");

  // Create provider
  const provider = new OpenAIProvider({
    model: "gpt-4o",
  });

  // Create tool registry
  const toolRegistry = new ToolRegistry();

  // Add a custom local tool
  const systemInfoTool = defineTool("get_system_info", {
    description: "Get basic system information",
    parameters: z.object({}),
    execute: async () => {
      return {
        title: "System Info",
        output: JSON.stringify({
          platform: process.platform,
          nodeVersion: process.version,
          arch: process.arch,
          cwd: process.cwd(),
        }, null, 2),
      };
    },
  });
  toolRegistry.register(systemInfoTool);

  // Create MCP client for filesystem access
  // Note: This requires @modelcontextprotocol/server-filesystem to be installed
  // You can install it with: npm install -g @modelcontextprotocol/server-filesystem
  const mcpClient = new MCPClient({
    name: "filesystem",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      process.cwd(), // Allow access to current directory
    ],
  });

  try {
    console.log("Connecting to MCP server...");
    await mcpClient.connect();
    console.log("Connected!\n");

    // Create adapter and load MCP tools
    const mcpAdapter = new MCPToolAdapter(mcpClient);
    await mcpAdapter.loadTools();

    // Register MCP tools with the agent
    const mcpTools = mcpAdapter.getAllTools();
    console.log(`Loaded ${mcpTools.length} MCP tools:`);
    for (const tool of mcpTools) {
      console.log(`  - ${tool.id}: ${tool.description}`);
      toolRegistry.register(tool);
    }
    console.log();

    // Create agent with both local and MCP tools
    const agent = new Agent(
      {
        provider,
        maxSteps: 15,
        systemPrompt:
          "You are a helpful assistant with access to the filesystem via MCP tools. " +
          "You can read, write, and list files. Help users manage their files.",
        temperature: 0.3,
        toolTimeout: 30000,
        onTextDelta: (text) => process.stdout.write(text),
        onToolCall: (tool, input) => {
          console.log(`\n[Tool: ${tool}]`);
          console.log(`  Input: ${JSON.stringify(input).slice(0, 100)}...`);
        },
        onToolResult: (tool, result) => {
          const output = result.output.length > 200
            ? result.output.slice(0, 200) + "..."
            : result.output;
          console.log(`  Result: ${output}`);
        },
        onError: (error) => {
          console.error(`\nError: ${error.message}`);
        },
      },
      toolRegistry
    );

    // Run some queries
    const queries = [
      "List the files in the current directory",
      "Read the package.json file and tell me what this project is about",
    ];

    for (const query of queries) {
      console.log(`\n\nUser: ${query}`);
      console.log("Assistant: ");

      const result = await agent.run(query);

      console.log(`\n[Status: ${result.status}, Steps: ${result.stepsCompleted}]`);
    }

  } catch (error) {
    console.error("Error:", error);
    console.log("\nNote: Make sure you have the MCP filesystem server installed:");
    console.log("  npm install -g @modelcontextprotocol/server-filesystem");
  } finally {
    // Disconnect MCP client
    await mcpClient.disconnect();
    console.log("\n\nMCP client disconnected.");
  }
}

main().catch(console.error);
