/**
 * DeepSeek usage example
 *
 * Demonstrates how to use the SDK with DeepSeek API
 *
 * Prerequisites:
 * - Set DEEPSEEK_API_KEY environment variable
 *   export DEEPSEEK_API_KEY="your-deepseek-api-key"
 */

import "dotenv/config"
import { createAgent, createTool } from "../src/index.js"

async function main() {
  console.log("=== DeepSeek Agent Example ===\n")

  // Method 1: Using provider option (recommended)
  const agent = createAgent({
    provider: "deepseek",
    model: "deepseek-chat", // or "deepseek-reasoner" for reasoning model
    systemPrompt: "You are a helpful assistant. Be concise and friendly.",
  })

  // Add a simple tool
  agent.addTool(
    "get_time",
    "Get the current time",
    {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "Timezone name, e.g., 'Asia/Shanghai', 'America/New_York'",
        },
      },
    },
    async (args) => {
      const { timezone = "UTC" } = args as { timezone?: string }
      const now = new Date()
      try {
        const time = now.toLocaleString("en-US", { timeZone: timezone })
        return `Current time in ${timezone}: ${time}`
      } catch {
        return `Invalid timezone: ${timezone}`
      }
    }
  )

  // Run a simple query
  console.log("User: What is 25 * 4?")
  await agent.run("What is 25 * 4?")
  console.log("\nAssistant:", agent.getLastResponse())

  console.log("\n" + "=".repeat(50) + "\n")

  // Run with tool calling
  console.log("User: What time is it in Tokyo and New York?")
  await agent.run("What time is it in Tokyo and New York?")
  console.log("\nAssistant:", agent.getLastResponse())

  console.log("\n" + "=".repeat(50) + "\n")

  // Streaming example
  console.log("User: Tell me a short joke (streaming)\n")
  agent.clearHistory()

  for await (const event of agent.stream("Tell me a short joke")) {
    switch (event.type) {
      case "text":
        process.stdout.write(event.text)
        break
      case "tool_call":
        console.log(`\n[Tool call: ${event.name}]`)
        break
      case "tool_result":
        console.log(`[Tool result: ${event.result.slice(0, 50)}...]`)
        break
      case "error":
        console.error(`\nError: ${event.error.message}`)
        break
    }
  }

  console.log("\n")
}

// Method 2: Using custom LLMClient with explicit configuration
async function customClientExample() {
  console.log("=== Custom LLM Client Example ===\n")

  const { LLMClient, Agent } = await import("../src/index.js")

  // Create a custom LLM client with explicit configuration
  const llmClient = new LLMClient({
    provider: "deepseek",
    // Or use explicit credentials:
    // apiKey: "your-api-key",
    // baseURL: "https://api.deepseek.com",
  })

  const agent = new Agent({
    llmClient,
    model: "deepseek-chat",
    systemPrompt: "You are a helpful coding assistant.",
  })

  await agent.run("What is TypeScript?")
  console.log("Assistant:", agent.getLastResponse())
}

// Method 3: Using with any OpenAI-compatible API
async function customAPIExample() {
  console.log("=== Custom API Example ===\n")

  const { LLMClient, Agent } = await import("../src/index.js")

  // For any OpenAI-compatible API (e.g., local LLM, other providers)
  const llmClient = new LLMClient({
    apiKey: process.env.CUSTOM_API_KEY ?? "your-api-key",
    baseURL: process.env.CUSTOM_API_URL ?? "http://localhost:11434/v1", // e.g., Ollama
  })

  const agent = new Agent({
    llmClient,
    model: "llama3", // Model name depends on your API
    systemPrompt: "You are a helpful assistant.",
  })

  // Note: Tool calling support depends on the API
  console.log("Custom API agent created. Tool support depends on the API.")
}

main().catch((error) => {
  console.error("Error:", error.message)
  console.log("\n💡 Make sure to set DEEPSEEK_API_KEY environment variable:")
  console.log("   export DEEPSEEK_API_KEY='your-deepseek-api-key'")
})
