/**
 * Simple Agent SDK
 *
 * A lightweight agent SDK with tool calling and MCP support
 * Supports OpenAI, DeepSeek, and any OpenAI-compatible API
 *
 * @example
 * ```typescript
 * import { createAgent, createTool } from "x-simple-agent"
 *
 * // Create an agent with OpenAI
 * const agent = createAgent({
 *   model: "gpt-4o",
 *   systemPrompt: "You are a helpful assistant.",
 * })
 *
 * // Or use DeepSeek
 * const deepseekAgent = createAgent({
 *   provider: "deepseek",
 *   model: "deepseek-chat",
 *   systemPrompt: "You are a helpful assistant.",
 * })
 *
 * // Add a custom tool
 * agent.addTool("get_weather", "Get the weather", {
 *   type: "object",
 *   properties: { location: { type: "string" } },
 *   required: ["location"],
 * }, async (args) => {
 *   const { location } = args as { location: string }
 *   return `Weather in ${location}: Sunny, 22°C`
 * })
 *
 * // Run the agent
 * const messages = await agent.run("What's the weather in Tokyo?")
 * console.log(agent.getLastResponse())
 * ```
 */

// Types
export type {
  // Message types
  Message,
  MessageContent,
  TextContent,
  ToolCallContent,
  ToolResultContent,
  // Tool types
  Tool,
  ToolDefinition,
  ToolResult,
  JSONSchema,
  // LLM types
  ModelConfig,
  LLMInput,
  LLMOutput,
  LLMEvent,
  Usage,
  FinishReason,
  // Session types
  Session,
  SessionStatus,
  // Agent types
  AgentConfig,
  AgentEvent,
  // MCP types
  MCPConfig,
  MCPTransportType,
  // Permission types
  Permission,
  PermissionAction,
  PermissionContext,
  // Retry types
  RetryConfig,
} from "./types/index.js"

// Agent
export { Agent, createAgent } from "./agent/index.js"
export type { AgentOptions } from "./agent/index.js"

// LLM
export { LLMClient, defaultClient, LLM_PROVIDERS } from "./llm/index.js"
export type { LLMClientConfig, LLMProvider } from "./llm/index.js"

// Tools
export {
  ToolRegistry,
  globalRegistry,
  ToolExecutor,
  createTool,
  bashTool,
  readTool,
  writeTool,
  httpTool,
  allBuiltinTools,
} from "./tool/index.js"
export type { ExecutionContext, ExecutionHooks } from "./tool/index.js"

// Session
export { SessionManager } from "./session/index.js"
export type { SessionOptions } from "./session/index.js"

// MCP
export { MCPClient, adaptMCPTool, loadMCPTools } from "./mcp/index.js"
export type { MCPToolDefinition } from "./mcp/index.js"

// Utils
export { sleep, withRetry, generateId, truncateText, safeJsonParse } from "./utils/index.js"
