# Simple Agent SDK

A simple, extensible agent SDK with tool calling and MCP support.

## Features

- **Tool Calling**: Define tools with Zod schemas for type-safe parameter validation
- **Streaming-First**: Real-time feedback with streaming responses
- **Multi-turn Conversations**: Built-in conversation management
- **MCP Support**: Integrate Model Context Protocol servers for extended capabilities
- **Multi-Provider**: Supports OpenAI, DeepSeek, and custom providers
- **Extensible**: Easy to add custom tools and LLM providers

## Installation

```bash
cd week06/simple-agent
npm install
```

## Quick Start

```typescript
import { z } from "zod";
import { Agent, DeepSeekProvider, defineTool, ToolRegistry } from "simple-agent";

// Define a tool
const echoTool = defineTool("echo", {
  description: "Echo back the input message",
  parameters: z.object({
    message: z.string().describe("The message to echo"),
  }),
  execute: async (args) => ({
    title: "Echo",
    output: `Echo: ${args.message}`,
  }),
});

// Create agent with DeepSeek
const toolRegistry = new ToolRegistry();
toolRegistry.register(echoTool);

const agent = new Agent({
  provider: new DeepSeekProvider({ model: "deepseek-chat" }),
  maxSteps: 10,
  systemPrompt: "You are a helpful assistant.",
  onTextDelta: (text) => process.stdout.write(text),
}, toolRegistry);

// Run agent
const result = await agent.run("Hello!");
```

## Providers

### DeepSeek (Recommended for Chinese users)

```typescript
import { DeepSeekProvider } from "simple-agent";

const provider = new DeepSeekProvider({
  apiKey: "your-api-key", // or set DEEPSEEK_API_KEY env var
  model: "deepseek-chat", // or "deepseek-coder"
});
```

### OpenAI

```typescript
import { OpenAIProvider } from "simple-agent";

const provider = new OpenAIProvider({
  apiKey: "your-api-key", // or set OPENAI_API_KEY env var
  model: "gpt-4o",
});
```

### Mock Provider (for testing)

```typescript
import { MockLLMProvider } from "simple-agent";

const provider = new MockLLMProvider();
provider.queueTextResponse("Hello! How can I help you?");
```

## Configuration

The SDK supports multiple ways to configure your API key:

### 1. Command Line Arguments

```bash
npm run example:deepseek -- --api-key YOUR_KEY
npm run example:deepseek -- --api-key YOUR_KEY --model deepseek-coder
npm run example:deepseek -- --api-key YOUR_KEY --provider openai
```

### 2. Environment Variables

```bash
# DeepSeek
export DEEPSEEK_API_KEY=your-api-key
export DEEPSEEK_MODEL=deepseek-chat  # optional

# OpenAI
export OPENAI_API_KEY=your-api-key
export OPENAI_MODEL=gpt-4o  # optional
```

### 3. Config File

Create `.simple-agent.json` in your project directory:

```json
{
  "provider": "deepseek",
  "apiKey": "your-api-key",
  "model": "deepseek-chat"
}
```

### 4. Interactive Prompt

If no configuration is found, the SDK will prompt you to enter your API key interactively and save it to `.simple-agent.json`.

### Programmatic Configuration

```typescript
import { loadConfig, showConfig, DeepSeekProvider, OpenAIProvider } from "simple-agent";

// Show current configuration
showConfig();

// Load config (auto-detects from CLI, env, file, or prompts)
const config = await loadConfig({ provider: "deepseek" });

// Create provider based on config
const provider = config.provider === "openai"
  ? new OpenAIProvider({ apiKey: config.apiKey, model: config.model })
  : new DeepSeekProvider({ apiKey: config.apiKey, model: config.model });
```

// Define a tool
const echoTool = defineTool("echo", {
  description: "Echo back the input message",
  parameters: z.object({
    message: z.string().describe("The message to echo"),
  }),
  execute: async (args) => ({
    title: "Echo",
    output: `Echo: ${args.message}`,
  }),
});

// Create agent
const toolRegistry = new ToolRegistry();
toolRegistry.register(echoTool);

const agent = new Agent({
  provider: new OpenAIProvider({ model: "gpt-4o" }),
  maxSteps: 10,
  systemPrompt: "You are a helpful assistant.",
  onTextDelta: (text) => process.stdout.write(text),
}, toolRegistry);

// Run agent
const result = await agent.run("Hello, can you echo 'Hello World'?");
```

## Core Concepts

### Tool Definition

Tools are defined using `defineTool` with Zod schemas:

```typescript
const calculatorTool = defineTool("calculator", {
  description: "Perform arithmetic operations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args, context) => {
    // args is type-safe based on the schema
    const result = args.a + args.b; // example
    return {
      title: "Calculation",
      output: `Result: ${result}`,
    };
  },
});
```

### Agent Configuration

```typescript
interface AgentConfig {
  provider: LLMProvider;      // LLM provider instance
  maxSteps: number;           // Maximum agentic loop iterations
  systemPrompt?: string;      // System prompt for the agent
  temperature?: number;       // LLM temperature
  maxTokens?: number;         // Maximum tokens per response
  toolTimeout?: number;       // Tool execution timeout (ms)

  // Callbacks
  onTextDelta?: (text: string) => void;
  onToolCall?: (tool: string, input: unknown) => void;
  onToolResult?: (tool: string, result: ToolResult) => void;
  onError?: (error: Error) => void;
}
```

### MCP Integration

Connect to MCP servers for extended capabilities:

```typescript
import { MCPClient, MCPToolAdapter } from "simple-agent";

// Create MCP client
const mcpClient = new MCPClient({
  name: "filesystem",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
});

// Connect and load tools
await mcpClient.connect();
const adapter = new MCPToolAdapter(mcpClient);
await adapter.loadTools();

// Register MCP tools with agent
for (const tool of adapter.getAllTools()) {
  toolRegistry.register(tool);
}
```

## Examples

Run the examples:

```bash
# With DeepSeek (recommended)
export DEEPSEEK_API_KEY=your-api-key
npm run example:deepseek

# With OpenAI
export OPENAI_API_KEY=your-api-key
npm run example:basic

# Calculator tool
npm run example:calculator

# Weather tool
npm run example:weather

# MCP integration
npm run example:mcp

# Testing with mock provider (no API key needed)
npm run example:testing
```

### Testing Without API Calls

Use the `MockLLMProvider` for testing agent behavior:

```typescript
import { MockLLMProvider, Agent, defineTool } from "simple-agent";

const mockProvider = new MockLLMProvider();

// Queue tool call response
mockProvider.queueToolCallResponse([
  { id: "call_1", name: "calculator", input: { operation: "add", a: 5, b: 3 } }
]);

// Queue final response
mockProvider.queueTextResponse("The result is 8.");

// Test your agent
const agent = new Agent({ provider: mockProvider, maxSteps: 10 }, toolRegistry);
const result = await agent.run("What is 5 + 3?");
```

## Advanced Utilities

### Doom Loop Detection

Prevent infinite loops when the LLM repeatedly calls the same tool:

```typescript
import { DoomLoopDetector } from "simple-agent";

const detector = new DoomLoopDetector(3); // threshold = 3

// Before executing tool:
if (detector.check(toolCall.name, toolCall.input)) {
  throw new Error("Doom loop detected!");
}
```

### Retry with Exponential Backoff

```typescript
import { withRetry } from "simple-agent";

const result = await withRetry(
  () => fetchData(),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: ["ECONNRESET", "ETIMEDOUT"],
  }
);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Agent Loop                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │   │
│  │   │   Message   │───▶│     LLM     │───▶│   Tool      │ │   │
│  │   │   History   │    │   Provider  │    │   Executor  │ │   │
│  │   └─────────────┘    └─────────────┘    └─────────────┘ │   │
│  │         ▲                                    │          │   │
│  │         │                                    ▼          │   │
│  │         └─────────│      Tool Registry         │       │   │
│  │                   └─────────────────────────────┘       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| `ToolRegistry` | Manages registered tools |
| `ToolExecutor` | Executes tool calls with timeout support |
| `ConversationManager` | Manages message history |
| `Agent` | Main agent loop with streaming |
| `OpenAIProvider` | OpenAI LLM implementation |
| `MCPClient` | MCP server connection |
| `MCPToolAdapter` | Converts MCP tools to SDK tools |

## API Reference

### Agent

```typescript
class Agent {
  constructor(config: AgentConfig, toolRegistry?: ToolRegistry);

  addTool(tool: Tool): void;
  run(userMessage: string, abortSignal?: AbortSignal): Promise<AgentLoopResult>;
  getToolRegistry(): ToolRegistry;
  getConversation(): ConversationManager;
}
```

### AgentLoopResult

```typescript
interface AgentLoopResult {
  status: "completed" | "max_steps" | "error" | "aborted";
  finalMessage?: AssistantMessage;
  error?: Error;
  stepsCompleted: number;
}
```

### Message Types

```typescript
type Message = UserMessage | AssistantMessage;

interface UserMessage {
  id: string;
  role: "user";
  content: string;
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  parts: MessagePart[];
}

type MessagePart = TextPart | ToolCallPart | ToolResultPart | ReasoningPart;
```

## License

MIT
