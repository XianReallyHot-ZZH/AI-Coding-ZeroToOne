import { z } from "zod";

// ============================================
// Message Types
// ============================================

export interface BaseMessage {
  id: string;
  role: "user" | "assistant";
}

export interface UserMessage extends BaseMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  parts: MessagePart[];
}

export type Message = UserMessage | AssistantMessage;

// Message parts - discriminated union
export type MessagePart = TextPart | ToolCallPart | ToolResultPart | ReasoningPart;

export interface TextPart {
  type: "text";
  text: string;
}

export interface ToolCallPart {
  type: "tool_call";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultPart {
  type: "tool_result";
  toolCallId: string;
  output: string;
  error?: string;
}

export interface ReasoningPart {
  type: "reasoning";
  text: string;
}

// ============================================
// Tool Types
// ============================================

export interface ToolContext {
  sessionId: string;
  messageId: string;
  abortSignal: AbortSignal;
  messages: MessagePart[];
}

export interface ToolResult<TMetadata = Record<string, unknown>> {
  title: string;
  output: string;
  metadata?: TMetadata;
}

export interface Tool<TSchema extends z.ZodType = z.ZodType> {
  id: string;
  description: string;
  parameters: TSchema;
  execute(args: z.infer<TSchema>, context: ToolContext): Promise<ToolResult>;
}

// ============================================
// LLM Provider Types
// ============================================

export interface LLMChunk {
  type: "text" | "tool_call" | "reasoning" | "error" | "done";
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  finishReason?: "stop" | "tool_calls" | "error" | "length";
}

export interface LLMStreamOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

export interface LLMProvider {
  stream(
    messages: Message[],
    tools: Tool[],
    options?: LLMStreamOptions
  ): AsyncIterable<LLMChunk>;
}

// ============================================
// Agent Types
// ============================================

export interface AgentConfig {
  provider: LLMProvider;
  maxSteps: number;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  toolTimeout?: number;
  onTextDelta?: (text: string) => void;
  onToolCall?: (tool: string, input: unknown) => void;
  onToolResult?: (tool: string, result: ToolResult) => void;
  onError?: (error: Error) => void;
}

export interface AgentLoopResult {
  status: "completed" | "max_steps" | "error" | "aborted";
  finalMessage?: AssistantMessage;
  error?: Error;
  stepsCompleted: number;
}

// ============================================
// MCP Types
// ============================================

export interface MCPToolConfig {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPClientInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<MCPToolConfig[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult>;
}
