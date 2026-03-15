/**
 * MCP (Model Context Protocol) example
 *
 * Demonstrates how to integrate MCP servers with the agent
 *
 * Prerequisites:
 * - Install an MCP server, e.g., @modelcontextprotocol/server-filesystem
 *   npm install -g @modelcontextprotocol/server-filesystem
 *
 * Or use npx to run it directly:
 *   npx @anthropic-ai/mcp-server-filesystem /path/to/directory
 */

import "dotenv/config"
import { createAgent, MCPClient, loadMCPTools } from "../src/index.js"

async function main() {
  console.log("=== MCP Integration Example ===\n")

  // Create an MCP client
  const mcpClient = new MCPClient()

  // Configure the MCP server (using filesystem server as example)
  const mcpConfig = {
    name: "filesystem",
    type: "stdio" as const,
    command: "npx",
    args: [
      "-y",
      "@anthropic-ai/mcp-server-filesystem",
      process.cwd(), // Allow access to current directory
    ],
  }

  try {
    console.log("Connecting to MCP server...")
    await mcpClient.connect(mcpConfig)
    console.log("✅ Connected to MCP server:", mcpClient.getServerName())

    // List available tools from MCP server
    console.log("\n📋 Listing MCP tools...")
    const mcpTools = await loadMCPTools(mcpClient)
    console.log(`Found ${mcpTools.length} tools:`)
    for (const tool of mcpTools) {
      console.log(`  - ${tool.name}: ${tool.description?.slice(0, 60)}...`)
    }

    // Create an agent with MCP tools
    const agent = createAgent({
      model: "gpt-4o-mini",
      systemPrompt: `You are a helpful assistant with access to the filesystem.
Use the available tools to help users with file operations.
Be careful with file operations and always confirm what you're doing.`,
      tools: mcpTools,
    })

    // Example: List files in the current directory
    console.log("\n" + "=".repeat(50))
    console.log("\n🔍 Example 1: Listing files\n")
    console.log("User: List the files in the current directory")

    await agent.run("List the files in the current directory")
    console.log("\nAssistant:", agent.getLastResponse())

    // Example: Read a file
    console.log("\n" + "=".repeat(50))
    console.log("\n📖 Example 2: Reading a file\n")

    // Clear history for a fresh conversation
    agent.clearHistory()
    console.log("User: Read the package.json file and tell me what this project is about")

    await agent.run("Read the package.json file and tell me what this project is about")
    console.log("\nAssistant:", agent.getLastResponse())

    // Example: Streaming with MCP tools
    console.log("\n" + "=".repeat(50))
    console.log("\n🌊 Example 3: Streaming with MCP tools\n")

    agent.clearHistory()
    console.log("User: What TypeScript files are in the src directory?")

    for await (const event of agent.stream("What TypeScript files are in the src directory?")) {
      if (event.type === "text") {
        process.stdout.write(event.text)
      } else if (event.type === "tool_call") {
        console.log(`\n🔧 Tool call: ${event.name}`)
      } else if (event.type === "tool_result") {
        console.log(`✅ Result received`)
      } else if (event.type === "error") {
        console.error(`❌ Error: ${event.error.message}`)
      }
    }

    console.log("\n")

  } catch (error) {
    console.error("❌ MCP Error:", error instanceof Error ? error.message : error)
    console.log("\n💡 Tip: Make sure you have the MCP server installed:")
    console.log("   npm install -g @anthropic-ai/mcp-server-filesystem")
    console.log("   Or use npx to run it directly.")
  } finally {
    // Disconnect from MCP server
    console.log("\n🔌 Disconnecting from MCP server...")
    await mcpClient.disconnect()
    console.log("✅ Disconnected")
  }
}

// Alternative example using a custom MCP server
async function customMCPExample() {
  console.log("\n=== Custom MCP Server Example ===\n")

  const mcpClient = new MCPClient()

  // Example configuration for a custom MCP server
  // Replace with your actual MCP server configuration
  const customConfig = {
    name: "custom-server",
    type: "stdio" as const,
    command: "node",
    args: ["path/to/your/mcp-server.js"],
    env: {
      API_KEY: "your-api-key",
    },
  }

  try {
    await mcpClient.connect(customConfig)
    const tools = await loadMCPTools(mcpClient)

    const agent = createAgent({
      model: "gpt-4o-mini",
      tools,
    })

    // Use the agent with MCP tools
    await agent.run("Hello!")
    console.log(agent.getLastResponse())

  } finally {
    await mcpClient.disconnect()
  }
}

main().catch(console.error)
