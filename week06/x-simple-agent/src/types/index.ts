/**
 * Core type definitions for the Simple Agent SDK
 */

// ============================================================================
// Message Types
// ============================================================================

export interface TextContent {
  type: "text"
  text: string
}

export interface ToolCallContent {
  type: "tool_call"
  id: string
  name: string
  arguments: unknown
}

export interface ToolResultContent {
  type: "tool_result"
  toolCallId: string
  result: string
  isError?: boolean
}

export type MessageContent = TextContent | ToolCallContent | ToolResultContent

export interface Message {
  id: string
  role: "user" | "assistant" | "tool"
  content: MessageContent[]
  createdAt: Date
}

// ============================================================================
// Tool Types
// ============================================================================

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  description?: string
  enum?: string[]
  [key: string]: unknown
}

export interface ToolResult {
  output: string
  metadata?: Record<string, unknown>
  error?: string
}

export interface Tool {
  name: string
  description: string
  parameters: JSONSchema
  execute: (args: unknown) => Promise<ToolResult>
}

export interface ToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: JSONSchema
  }
}

// ============================================================================
// LLM Types
// ============================================================================

export interface ModelConfig {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
}

export interface LLMInput {
  model: string
  messages: Message[]
  systemPrompt?: string
  tools: ToolDefinition[]
  abortSignal?: AbortSignal
  temperature?: number
  maxTokens?: number
}

export interface Usage {
  inputTokens: number
  outputTokens: number
}

export type FinishReason = "stop" | "tool_calls" | "max_tokens" | "error"

export interface LLMOutput {
  content: MessageContent[]
  finishReason: FinishReason
  usage: Usage
}

export type LLMEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call_start"; id: string; name: string }
  | { type: "tool_call_delta"; id: string; arguments: string }
  | { type: "tool_call_end"; id: string }
  | { type: "finish"; reason: FinishReason; usage: Usage }
  | { type: "error"; error: Error }

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = "idle" | "running" | "completed" | "error"

export interface Session {
  id: string
  messages: Message[]
  systemPrompt?: string
  model: ModelConfig
  tools: Tool[]
  status: SessionStatus
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentConfig {
  model: string
  systemPrompt?: string
  tools?: Tool[]
  maxSteps?: number
  temperature?: number
  maxTokens?: number
}

export type AgentEvent =
  | { type: "message_start"; role: "assistant" }
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; args: unknown }
  | { type: "tool_result"; id: string; name: string; result: string; isError?: boolean }
  | { type: "message_end"; finishReason: FinishReason }
  | { type: "step_start"; step: number }
  | { type: "step_end"; step: number }
  | { type: "error"; error: Error }

// ============================================================================
// MCP Types
// ============================================================================

export type MCPTransportType = "stdio" | "sse" | "ws"

export interface MCPStdioConfig {
  type: "stdio"
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface MCPSseConfig {
  type: "sse"
  url: string
  headers?: Record<string, string>
}

export interface MCPWsConfig {
  type: "ws"
  url: string
}

export type MCPConfig = (MCPStdioConfig | MCPSseConfig | MCPWsConfig) & {
  name: string
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionAction = "allow" | "deny" | "ask"

export interface Permission {
  tool: string | RegExp
  action: PermissionAction
  patterns?: string[]
}

export interface PermissionContext {
  tool: string
  args: unknown
  session: Session
}

// ============================================================================
// Retry Types
// ============================================================================

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryableErrors: string[]
}
