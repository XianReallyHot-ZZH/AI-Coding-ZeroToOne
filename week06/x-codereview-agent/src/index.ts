/**
 * CodeReview Agent
 *
 * A code review agent based on x-simple-agent SDK
 * Supports multiple review scenarios: branch diff, commit diff, PR diff, uncommitted changes
 */

import { createAgent, readTool, writeTool, type Agent, type Tool } from "x-simple-agent"
import { gitTool, ghTool } from "./tools/index.js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Load system prompt
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const systemPromptPath = join(__dirname, "../prompts/system.md")
const systemPrompt = readFileSync(systemPromptPath, "utf-8")

export interface CodeReviewAgentOptions {
  model?: string
  provider?: "openai" | "deepseek"
  apiKey?: string
  baseURL?: string
  maxSteps?: number
}

/**
 * Create a CodeReview Agent instance
 */
export function createCodeReviewAgent(options: CodeReviewAgentOptions = {}): Agent {
  const tools: Tool[] = [readTool, writeTool, gitTool, ghTool]

  const agentOptions: {
    model: string
    systemPrompt: string
    tools: Tool[]
    maxSteps: number
    provider?: "openai" | "deepseek"
    apiKey?: string
    baseURL?: string
  } = {
    model: options.model ?? (options.provider === "deepseek" ? "deepseek-chat" : "gpt-4o"),
    systemPrompt,
    tools,
    maxSteps: options.maxSteps ?? 100,
  }

  // Only add optional properties if they are defined
  if (options.provider !== undefined) {
    agentOptions.provider = options.provider
  }
  if (options.apiKey !== undefined) {
    agentOptions.apiKey = options.apiKey
  }
  if (options.baseURL !== undefined) {
    agentOptions.baseURL = options.baseURL
  }

  return createAgent(agentOptions)
}

// Re-export tools for direct use
export { gitTool, ghTool, readTool, writeTool }

// Re-export types
export type { Tool, Agent }
