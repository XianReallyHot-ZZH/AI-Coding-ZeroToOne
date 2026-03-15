/**
 * Basic usage example
 *
 * Demonstrates the simplest way to create and use an agent
 */

import "dotenv/config"
import { createAgent } from "../src/index.js"

async function main() {
  console.log("=== Basic Agent Usage Example ===\n")

  // Create an agent with default configuration
  const agent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: "You are a helpful assistant. Be concise and friendly.",
  })

  // Run a simple query
  console.log("User: What is 2 + 2?")
  const messages = await agent.run("What is 2 + 2?")

  console.log("\nAssistant:", agent.getLastResponse())
  console.log("\nTotal messages:", messages.length)
}

main().catch(console.error)
