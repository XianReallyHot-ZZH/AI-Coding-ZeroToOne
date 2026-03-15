#!/usr/bin/env node
/**
 * CodeReview Agent CLI
 *
 * Usage:
 *   codereview "review current branch new code"
 *   codereview "review commit 13bad5"
 *   codereview "review PR #12"
 *   codereview "review uncommitted changes"
 */

import { createCodeReviewAgent } from "./index.js"
import "dotenv/config"

async function main() {
  const userInput = process.argv.slice(2).join(" ")

  if (!userInput) {
    console.log(`
CodeReview Agent - AI-powered code review assistant

Usage:
  codereview "review current branch new code"
  codereview "review commit 13bad5"
  codereview "review PR #12"
  codereview "review uncommitted changes"
  codereview "review src/auth/login.ts"

Environment Variables:
  PROVIDER       - LLM provider: "openai" or "deepseek" (default: "openai")
  MODEL          - Model name (default: "gpt-4o" or "deepseek-chat")
  OPENAI_API_KEY - API key for OpenAI
  DEEPSEEK_API_KEY - API key for DeepSeek
`)
    process.exit(0)
  }

  const provider = process.env.PROVIDER as "openai" | "deepseek" | undefined
  const model = process.env.MODEL
  const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.error("Error: No API key found. Set OPENAI_API_KEY or DEEPSEEK_API_KEY environment variable.")
    process.exit(1)
  }

  const agentOptions: {
    apiKey: string
    model?: string
    provider?: "openai" | "deepseek"
  } = { apiKey }

  if (model !== undefined) {
    agentOptions.model = model
  }
  if (provider !== undefined) {
    agentOptions.provider = provider
  }

  const agent = createCodeReviewAgent(agentOptions)

  console.log(`\n🔍 Code Review: ${userInput}\n`)

  try {
    for await (const event of agent.stream(userInput)) {
      switch (event.type) {
        case "text":
          process.stdout.write(event.text)
          break
        case "tool_call":
          console.log(`\n🔧 Calling: ${event.name}`)
          if (event.args && typeof event.args === "object") {
            const args = event.args as Record<string, unknown>
            if (args.command) {
              console.log(`   Command: ${args.command}`)
            }
            if (args.path) {
              console.log(`   Path: ${args.path}`)
            }
          }
          break
        case "tool_result":
          if (event.isError) {
            console.log(`❌ Error: ${event.result.slice(0, 150)}${event.result.length > 150 ? "..." : ""}`)
          } else {
            console.log(`✅ Done`)
          }
          break
        case "error":
          console.error(`\n❌ Error: ${event.error.message}`)
          break
      }
    }
    console.log("\n")
  } catch (error) {
    console.error("Failed:", error)
    process.exit(1)
  }
}

main()
