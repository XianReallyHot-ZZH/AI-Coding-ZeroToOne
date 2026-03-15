/**
 * Streaming example
 *
 * Demonstrates how to use streaming output for real-time feedback
 */

import "dotenv/config"
import { createAgent, type AgentEvent } from "../src/index.js"

async function main() {
  console.log("=== Streaming Agent Example ===\n")

  const agent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: "You are a helpful assistant. Provide detailed and thoughtful responses.",
  })

  // Add a simple tool for demonstration
  agent.addTool(
    "search",
    "Search for information on a topic",
    {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    async (args) => {
      const { query } = args as { query: string }
      // Simulated search results
      return `Found 3 results for "${query}":
1. Wikipedia article on ${query}
2. Research paper: Understanding ${query}
3. Blog post: Introduction to ${query}`
    }
  )

  console.log("User: Tell me about the history of computing, and search for 'Alan Turing'\n")
  console.log("Assistant (streaming):")

  // Process streaming events
  for await (const event of agent.stream(
    "Tell me about the history of computing, and search for 'Alan Turing'"
  )) {
    handleEvent(event)
  }

  console.log("\n\n--- Final Response ---")
  console.log(agent.getLastResponse())
}

function handleEvent(event: AgentEvent) {
  switch (event.type) {
    case "step_start":
      console.log(`\n[Step ${event.step} started]`)
      break

    case "message_start":
      process.stdout.write("\n🤖 ")
      break

    case "text":
      process.stdout.write(event.text)
      break

    case "tool_call":
      console.log(`\n\n🔧 Calling tool: ${event.name}`)
      console.log(`   Args: ${JSON.stringify(event.args)}`)
      break

    case "tool_result":
      console.log(`\n✅ Tool result: ${event.result.slice(0, 100)}${event.result.length > 100 ? "..." : ""}`)
      if (event.isError) {
        console.log("   ⚠️ Error occurred")
      }
      break

    case "message_end":
      console.log(`\n[Message ended: ${event.finishReason}]`)
      break

    case "step_end":
      console.log(`[Step ${event.step} completed]`)
      break

    case "error":
      console.error(`\n❌ Error: ${event.error.message}`)
      break
  }
}

main().catch(console.error)
