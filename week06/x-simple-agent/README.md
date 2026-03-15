# X Simple Agent SDK

A lightweight, TypeScript-based Agent SDK with tool calling and MCP (Model Context Protocol) support. Works with OpenAI, DeepSeek, and any OpenAI-compatible API.

## Features

- 🤖 **Simple Agent Loop** - Core agent loop that handles multi-turn conversations with tool calling
- 🏢 **Multi-Provider Support** - Works with OpenAI, DeepSeek, and any OpenAI-compatible API
- 🔧 **Flexible Tool System** - Easy-to-use tool registration and execution
- 🌊 **Streaming Support** - Real-time streaming output for responsive UX
- 🔌 **MCP Integration** - Connect to MCP servers and use their tools seamlessly
- 📦 **Built-in Tools** - Includes bash, file read/write, and HTTP tools
- 💪 **TypeScript First** - Full type safety and excellent IDE support

## Installation

```bash
npm install
```

## Quick Start

### Using OpenAI

```typescript
import { createAgent } from "x-simple-agent"

const agent = createAgent({
  model: "gpt-4o",
  systemPrompt: "You are a helpful assistant.",
})

const messages = await agent.run("What is 2 + 2?")
console.log(agent.getLastResponse())
```

### Using DeepSeek

```typescript
import { createAgent } from "x-simple-agent"

const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
  systemPrompt: "You are a helpful assistant.",
})

const messages = await agent.run("What is 2 + 2?")
console.log(agent.getLastResponse())
```

## Supported Providers

| Provider | Environment Variable | Default Model | Base URL |
|----------|---------------------|---------------|----------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o | https://api.openai.com/v1 |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat | https://api.deepseek.com |
| Custom | - | - | Your baseURL |

## Configuration Options

```typescript
import { createAgent, LLMClient } from "x-simple-agent"

// Method 1: Using provider preset
const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
  systemPrompt: "You are a helpful assistant.",
})

// Method 2: Explicit credentials
const agent2 = createAgent({
  apiKey: "your-api-key",
  baseURL: "https://api.example.com/v1",
  model: "your-model",
})

// Method 3: Custom LLM client
const llmClient = new LLMClient({
  apiKey: "your-api-key",
  baseURL: "http://localhost:11434/v1", // e.g., Ollama
})

const agent3 = createAgent({
  llmClient,
  model: "llama3",
})
```

## Adding Custom Tools

### Method 1: Using `createTool`

```typescript
import { createAgent, createTool } from "x-simple-agent"

const weatherTool = createTool(
  "get_weather",
  "Get the current weather for a location",
  {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" },
    },
    required: ["location"],
  },
  async (args) => {
    const { location } = args as { location: string }
    return {
      output: `Weather in ${location}: Sunny, 22°C`,
    }
  }
)

const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
  tools: [weatherTool],
})
```

### Method 2: Using `addTool`

```typescript
const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
})

agent.addTool(
  "calculate",
  "Perform arithmetic operations",
  {
    type: "object",
    properties: {
      expression: { type: "string" },
    },
    required: ["expression"],
  },
  async (args) => {
    const { expression } = args as { expression: string }
    const result = eval(expression) // Use a proper parser in production!
    return `Result: ${result}`
  }
)
```

## Streaming Output

```typescript
const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
})

for await (const event of agent.stream("Tell me a story")) {
  switch (event.type) {
    case "text":
      process.stdout.write(event.text)
      break
    case "tool_call":
      console.log(`Calling tool: ${event.name}`)
      break
    case "tool_result":
      console.log(`Result: ${event.result}`)
      break
  }
}
```

## MCP Integration

Connect to MCP servers and use their tools:

```typescript
import { createAgent, MCPClient, loadMCPTools } from "x-simple-agent"

const mcpClient = new MCPClient()

// Connect to an MCP server
await mcpClient.connect({
  name: "filesystem",
  type: "stdio",
  command: "npx",
  args: ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/dir"],
})

// Load tools from MCP server
const mcpTools = await loadMCPTools(mcpClient)

// Create agent with MCP tools
const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
  tools: mcpTools,
})

// Use the agent
await agent.run("List files in the directory")
console.log(agent.getLastResponse())

// Disconnect when done
await mcpClient.disconnect()
```

## Built-in Tools

The SDK includes several built-in tools:

- `bash` - Execute shell commands
- `read_file` - Read file contents
- `write_file` - Write content to files
- `http_request` - Make HTTP requests

```typescript
import { createAgent, allBuiltinTools } from "x-simple-agent"

const agent = createAgent({
  provider: "deepseek",
  model: "deepseek-chat",
  tools: allBuiltinTools,
})
```

## API Reference

### `createAgent(options)`

Creates a new Agent instance.

**Options:**
- `provider` - LLM provider: "openai", "deepseek", or "custom" (default: "openai")
- `model` - Model to use (default: "gpt-4o" for OpenAI, "deepseek-chat" for DeepSeek)
- `apiKey` - API key (optional, uses environment variable if not provided)
- `baseURL` - Custom API base URL (optional)
- `systemPrompt` - System prompt for the agent
- `tools` - Array of tools to register
- `maxSteps` - Maximum agent loop steps (default: 200)
- `temperature` - LLM temperature
- `maxTokens` - Maximum tokens in response
- `llmClient` - Custom LLMClient instance

### `Agent`

**Methods:**
- `run(message)` - Run the agent with a user message (non-streaming)
- `stream(message)` - Run the agent with streaming output
- `addTool(name, description, parameters, handler)` - Add a custom tool
- `registerTool(tool)` - Register a Tool object
- `registerTools(tools)` - Register multiple tools
- `clearHistory()` - Clear conversation history
- `getLastResponse()` - Get the last assistant response as text
- `getSession()` - Get the current session
- `getToolRegistry()` - Get the tool registry

### `MCPClient`

**Methods:**
- `connect(config)` - Connect to an MCP server
- `disconnect()` - Disconnect from the server
- `listTools()` - List available tools
- `callTool(name, args)` - Call a tool on the server
- `isConnected()` - Check connection status

### `ToolRegistry`

**Methods:**
- `register(tool)` - Register a tool
- `registerAll(tools)` - Register multiple tools
- `unregister(name)` - Remove a tool
- `get(name)` - Get a tool by name
- `list()` - Get all tools
- `toToolDefinitions()` - Convert to LLM tool format

## Examples

See the `examples/` directory for more usage examples:

- `basic-usage.ts` - Simple agent usage
- `custom-tools.ts` - Creating custom tools
- `streaming.ts` - Streaming output
- `mcp-usage.ts` - MCP integration
- `deepseek-usage.ts` - DeepSeek API usage

## Running Examples

```bash
# For OpenAI
export OPENAI_API_KEY="your-openai-api-key"
npm run example:basic

# For DeepSeek
export DEEPSEEK_API_KEY="your-deepseek-api-key"
npm run example:deepseek

# Other examples
npm run example:custom-tools
npm run example:streaming
npm run example:mcp
```

## License

MIT
