/**
 * CodeReview Agent Usage Demo
 *
 * This file demonstrates how to use the CodeReview Agent programmatically.
 * Run with: tsx examples/usage-demo.ts
 */

import { createCodeReviewAgent, gitTool, ghTool } from "../src/index.js"
import "dotenv/config"

async function demo() {
  // Check if API key is available
  const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.log("No API key found. Demo will only show tool execution results.\n")

    // Demo: Direct tool usage without LLM
    console.log("=== Direct Tool Usage Demo ===\n")

    // 1. Git status
    console.log("1. Git Status:")
    const statusResult = await gitTool.execute({ command: "status --short" })
    console.log(statusResult.error || statusResult.output)
    console.log()

    // 2. Current branch
    console.log("2. Current Branch:")
    const branchResult = await gitTool.execute({ command: "rev-parse --abbrev-ref HEAD" })
    console.log(branchResult.error || branchResult.output)
    console.log()

    // 3. Recent commits
    console.log("3. Recent Commits:")
    const logResult = await gitTool.execute({ command: "log --oneline -n 5" })
    console.log(logResult.error || logResult.output)
    console.log()

    // 4. GitHub CLI (may not be installed)
    console.log("4. GitHub CLI Check:")
    const ghResult = await ghTool.execute({ command: "--version" })
    console.log(ghResult.error || ghResult.output)
    console.log()

    return
  }

  // Full demo with LLM
  console.log("=== CodeReview Agent Demo ===\n")

  const agent = createCodeReviewAgent({
    provider: process.env.PROVIDER as "openai" | "deepseek" | undefined,
    model: process.env.MODEL,
    apiKey,
  })

  // Example 1: Review uncommitted changes
  console.log("Reviewing uncommitted changes...\n")

  try {
    for await (const event of agent.stream("review uncommitted changes")) {
      switch (event.type) {
        case "text":
          process.stdout.write(event.text)
          break
        case "tool_call":
          console.log(`\n[Tool Call] ${event.name}`)
          break
        case "tool_result":
          console.log(`[Tool Result] ${event.isError ? "Error" : "Success"}`)
          break
        case "error":
          console.error(`\nError: ${event.error.message}`)
          break
      }
    }
    console.log("\n")
  } catch (error) {
    console.error("Failed:", error)
  }
}

demo()
