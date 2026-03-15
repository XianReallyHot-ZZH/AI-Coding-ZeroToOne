# Simple Multi-turn Agent with Tool Calling - Design Document

> Based on analysis of OpenCode source code in `venders/opencode`

## 1. Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Agent Loop                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │   │
│  │   │   Message   │───▶│     LLM     │───▶│   Tool      │ │   │
│  │   │   History   │    │   Provider  │    │   Executor  │ │   │
│  │   └─────────────┘    └─────────────┘    └─────────────┘ │   │
│  │         ▲                                    │          │   │
│  │         │                                    ▼          │   │
│  │         │         ┌─────────────────────────────┐       │   │
│  │         └─────────│      Tool Registry         │       │   │
│  │                   └─────────────────────────────┘       │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Zod Schema Validation**: Tools use Zod schemas for parameter validation, ensuring type safety and automatic error messages
2. **Streaming-First**: The agent loop is designed around streaming responses for real-time feedback
3. **Granular Message Parts**: Messages are composed of parts (text, tool_call, tool_result) for fine-grained tracking
4. **Tool State Machine**: Tools progress through states: pending → running → completed/error
5. **Agentic Loop**: Continuous iteration until natural completion or stop condition

## 2. Core Interfaces

### 2.1 Message Types

```typescript
// Base message structure
interface BaseMessage {
  id: string;
  role: "user" | "assistant";
}

// User message
interface UserMessage extends BaseMessage {
  role: "user";
  content: string;
}

// Assistant message with parts
interface AssistantMessage extends BaseMessage {
  role: "assistant";
  parts: MessagePart[];
}

// Message parts - discriminated union
type MessagePart = TextPart | ToolCallPart | ToolResultPart | ReasoningPart;

interface TextPart {
  type: "text";
  text: string;
}

interface ToolCallPart {
  type: "tool_call";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultPart {
  type: "tool_result";
  toolCallId: string;
  output: string;
  error?: string;
}

interface ReasoningPart {
  type: "reasoning";
  text: string;
}
```

### 2.2 Tool Definition Interface

```typescript
import { z } from "zod";

// Tool context - passed to execute function
interface ToolContext {
  sessionId: string;
  messageId: string;
  abortSignal: AbortSignal;
  messages: MessagePart[];
}

// Tool execution result
interface ToolResult<TMetadata = Record<string, unknown>> {
  title: string;
  output: string;
  metadata?: TMetadata;
}

// Tool definition
interface Tool<TSchema extends z.ZodType = z.ZodType> {
  id: string;
  description: string;
  parameters: TSchema;
  execute(
    args: z.infer<TSchema>,
    context: ToolContext
  ): Promise<ToolResult>;
}

// Helper function to define tools (inspired by OpenCode's Tool.define)
function defineTool<TSchema extends z.ZodType>(
  id: string,
  config: {
    description: string;
    parameters: TSchema;
    execute: (
      args: z.infer<TSchema>,
      context: ToolContext
    ) => Promise<ToolResult>;
    formatValidationError?: (error: z.ZodError) => string;
  }
): Tool<TSchema> {
  return {
    id,
    description: config.description,
    parameters: config.parameters,
    execute: async (args, context) => {
      // Validate input against schema
      const result = config.parameters.safeParse(args);
      if (!result.success) {
        const errorMsg = config.formatValidationError
          ? config.formatValidationError(result.error)
          : `Invalid arguments for ${id}: ${result.error.message}`;
        throw new Error(errorMsg);
      }
      return config.execute(result.data, context);
    },
  };
}
```

### 2.3 LLM Provider Abstraction

```typescript
// LLM response chunk (streaming)
interface LLMChunk {
  type: "text" | "tool_call" | "reasoning" | "error" | "done";
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  finishReason?: "stop" | "tool_calls" | "error" | "length";
}

// LLM provider interface
interface LLMProvider {
  // Stream response from LLM
  stream(
    messages: (UserMessage | AssistantMessage)[],
    tools: Tool[],
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      abortSignal?: AbortSignal;
    }
  ): AsyncIterable<LLMChunk>;
}

// Convert tools to provider-specific format
function toolsToProviderFormat(tools: Tool[]): unknown {
  return tools.map((tool) => ({
    name: tool.id,
    description: tool.description,
    parameters: zodToJsonSchema(tool.parameters),
  }));
}

// Helper to convert Zod schema to JSON Schema
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Implementation depends on the LLM provider's expected format
  // Many providers accept Zod schemas directly or via libraries
  return schema;
}
```

### 2.4 Agent Configuration

```typescript
interface AgentConfig {
  // LLM provider to use
  provider: LLMProvider;

  // Maximum agentic loop iterations
  maxSteps: number;

  // System prompt
  systemPrompt?: string;

  // Temperature for LLM responses
  temperature?: number;

  // Maximum tokens per response
  maxTokens?: number;

  // Tool call timeout in milliseconds
  toolTimeout?: number;

  // Callbacks for events
  onTextDelta?: (text: string) => void;
  onToolCall?: (tool: string, input: unknown) => void;
  onToolResult?: (tool: string, result: ToolResult) => void;
  onError?: (error: Error) => void;
}
```

## 3. Key Components

### 3.1 Tool Registry

```typescript
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  // Register a tool
  register(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool already registered: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  // Get a tool by ID
  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  // Get all registered tools
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Check if tool exists
  has(id: string): boolean {
    return this.tools.has(id);
  }

  // Remove a tool
  remove(id: string): boolean {
    return this.tools.delete(id);
  }
}
```

### 3.2 Tool Executor

```typescript
class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(
    toolCall: { id: string; name: string; input: Record<string, unknown> },
    context: ToolContext,
    timeout: number = 30000
  ): Promise<ToolResultPart> {
    const tool = this.registry.get(toolCall.name);

    if (!tool) {
      return {
        type: "tool_result",
        toolCallId: toolCall.id,
        output: "",
        error: `Unknown tool: ${toolCall.name}`,
      };
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        tool.execute(toolCall.input, context),
        this.createTimeout(timeout, toolCall.name),
      ]);

      return {
        type: "tool_result",
        toolCallId: toolCall.id,
        output: result.output,
      };
    } catch (error) {
      return {
        type: "tool_result",
        toolCallId: toolCall.id,
        output: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private createTimeout(ms: number, toolName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool ${toolName} timed out after ${ms}ms`));
      }, ms);
    });
  }
}
```

### 3.3 Conversation Manager

```typescript
class ConversationManager {
  private messages: (UserMessage | AssistantMessage)[] = [];

  // Add user message
  addUserMessage(content: string): UserMessage {
    const message: UserMessage = {
      id: this.generateId(),
      role: "user",
      content,
    };
    this.messages.push(message);
    return message;
  }

  // Add assistant message with parts
  addAssistantMessage(parts: MessagePart[]): AssistantMessage {
    const message: AssistantMessage = {
      id: this.generateId(),
      role: "assistant",
      parts,
    };
    this.messages.push(message);
    return message;
  }

  // Get all messages
  getMessages(): (UserMessage | AssistantMessage)[] {
    return [...this.messages];
  }

  // Get last message
  getLastMessage(): UserMessage | AssistantMessage | undefined {
    return this.messages[this.messages.length - 1];
  }

  // Clear conversation
  clear(): void {
    this.messages = [];
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 3.4 Agent Loop (Core Algorithm)

```typescript
interface AgentLoopResult {
  status: "completed" | "max_steps" | "error" | "aborted";
  finalMessage?: AssistantMessage;
  error?: Error;
  stepsCompleted: number;
}

async function runAgentLoop(
  config: AgentConfig,
  conversation: ConversationManager,
  toolRegistry: ToolRegistry,
  abortSignal?: AbortSignal
): Promise<AgentLoopResult> {
  const executor = new ToolExecutor(toolRegistry);
  let step = 0;

  while (step < config.maxSteps) {
    // Check for abort
    if (abortSignal?.aborted) {
      return { status: "aborted", stepsCompleted: step };
    }

    step++;

    // Current parts for this assistant message
    const currentParts: MessagePart[] = [];
    const toolCalls: { id: string; name: string; input: unknown }[] = [];

    try {
      // Stream LLM response
      const stream = config.provider.stream(
        conversation.getMessages(),
        toolRegistry.getAll(),
        {
          systemPrompt: config.systemPrompt,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          abortSignal,
        }
      );

      let finishReason: LLMChunk["finishReason"] = undefined;

      for await (const chunk of stream) {
        // Check abort during streaming
        if (abortSignal?.aborted) {
          return { status: "aborted", stepsCompleted: step };
        }

        switch (chunk.type) {
          case "text":
            if (chunk.content) {
              currentParts.push({ type: "text", text: chunk.content });
              config.onTextDelta?.(chunk.content);
            }
            break;

          case "tool_call":
            if (chunk.toolCall) {
              toolCalls.push(chunk.toolCall);
              currentParts.push({
                type: "tool_call",
                id: chunk.toolCall.id,
                name: chunk.toolCall.name,
                input: chunk.toolCall.input,
              });
              config.onToolCall?.(chunk.toolCall.name, chunk.toolCall.input);
            }
            break;

          case "reasoning":
            if (chunk.content) {
              currentParts.push({ type: "reasoning", text: chunk.content });
            }
            break;

          case "done":
            finishReason = chunk.finishReason;
            break;

          case "error":
            throw new Error(chunk.content || "Unknown LLM error");
        }
      }

      // Check finish reason
      if (finishReason === "stop" || finishReason === "length") {
        // Natural completion - save message and return
        const finalMessage = conversation.addAssistantMessage(currentParts);
        return {
          status: finishReason === "stop" ? "completed" : "error",
          finalMessage,
          stepsCompleted: step,
          error: finishReason === "length" ? new Error("Max tokens reached") : undefined,
        };
      }

      // Handle tool calls
      if (finishReason === "tool_calls" && toolCalls.length > 0) {
        // Execute all tool calls
        const toolResults: ToolResultPart[] = await Promise.all(
          toolCalls.map((tc) =>
            executor.execute(
              tc as { id: string; name: string; input: Record<string, unknown> },
              {
                sessionId: "session",
                messageId: "message",
                abortSignal: abortSignal || new AbortController().signal,
                messages: currentParts,
              },
              config.toolTimeout
            )
          )
        );

        // Add tool results to parts
        for (const result of toolResults) {
          currentParts.push(result);
          const tool = toolRegistry.get(result.toolCallId);
          if (tool) {
            config.onToolResult?.(tool.id, {
              title: "",
              output: result.output,
              metadata: { error: result.error },
            });
          }
        }

        // Save assistant message with all parts
        conversation.addAssistantMessage(currentParts);

        // Continue loop - LLM will see tool results in next iteration
        continue;
      }

      // No tool calls and no explicit stop - likely an error
      const finalMessage = conversation.addAssistantMessage(currentParts);
      return {
        status: "completed",
        finalMessage,
        stepsCompleted: step,
      };

    } catch (error) {
      config.onError?.(error as Error);
      return {
        status: "error",
        error: error as Error,
        stepsCompleted: step,
      };
    }
  }

  // Max steps reached
  return {
    status: "max_steps",
    stepsCompleted: step,
  };
}
```

## 4. Stop Conditions

The agent loop can terminate for several reasons (inspired by OpenCode):

| Condition | Description | Result Status |
|-----------|-------------|---------------|
| `stop` | LLM finished naturally without tool calls | `completed` |
| `tool_calls` + no tools | LLM requested tools but none available | `error` |
| `max_steps` | Exceeded maximum loop iterations | `max_steps` |
| `abort` | User cancelled via AbortSignal | `aborted` |
| `error` | LLM API error or tool execution error | `error` |
| `length` | Max output tokens reached | `error` |
| `context_overflow` | Context window exceeded (requires compaction) | `error` |

## 5. Example Implementations

### 5.1 Calculator Tool

```typescript
import { z } from "zod";

const calculatorTool = defineTool("calculator", {
  description: "Perform basic arithmetic operations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number().describe("First operand"),
    b: z.number().describe("Second operand"),
  }),
  execute: async (args, context) => {
    let result: number;

    switch (args.operation) {
      case "add":
        result = args.a + args.b;
        break;
      case "subtract":
        result = args.a - args.b;
        break;
      case "multiply":
        result = args.a * args.b;
        break;
      case "divide":
        if (args.b === 0) {
          throw new Error("Division by zero");
        }
        result = args.a / args.b;
        break;
    }

    return {
      title: `${args.a} ${args.operation} ${args.b}`,
      output: `Result: ${result}`,
      metadata: { result },
    };
  },
  formatValidationError: (error) => {
    return `Calculator requires 'operation' (add/subtract/multiply/divide) and two numbers 'a' and 'b'. ${error.message}`;
  },
});
```

### 5.2 Weather Tool

```typescript
import { z } from "zod";

const weatherTool = defineTool("get_weather", {
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name or coordinates"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
  }),
  execute: async (args, context) => {
    // Mock implementation - in real code, call a weather API
    const mockWeather = {
      location: args.location,
      temperature: args.unit === "fahrenheit" ? 72 : 22,
      condition: "Partly cloudy",
      humidity: 65,
    };

    return {
      title: `Weather in ${args.location}`,
      output: JSON.stringify(mockWeather, null, 2),
      metadata: mockWeather,
    };
  },
});
```

### 5.3 Mock LLM Provider (for Testing)

```typescript
class MockLLMProvider implements LLMProvider {
  private responses: LLMChunk[][] = [];

  // Queue a response sequence
  queueResponse(chunks: LLMChunk[]): void {
    this.responses.push(chunks);
  }

  async *stream(
    messages: (UserMessage | AssistantMessage)[],
    tools: Tool[],
    options?: { systemPrompt?: string }
  ): AsyncIterable<LLMChunk> {
    const response = this.responses.shift();

    if (!response) {
      yield { type: "error", content: "No queued response" };
      return;
    }

    for (const chunk of response) {
      // Simulate async streaming
      await new Promise((resolve) => setTimeout(resolve, 10));
      yield chunk;
    }
  }
}

// Usage example for testing
function createMockProvider(): MockLLMProvider {
  const provider = new MockLLMProvider();

  // Queue a response that calls a tool, then completes
  provider.queueResponse([
    { type: "text", content: "Let me calculate that for you. " },
    {
      type: "tool_call",
      toolCall: { id: "call_1", name: "calculator", input: { operation: "add", a: 5, b: 3 } },
    },
    { type: "done", finishReason: "tool_calls" },
  ]);

  // Queue the final response after tool result
  provider.queueResponse([
    { type: "text", content: "The result is 8." },
    { type: "done", finishReason: "stop" },
  ]);

  return provider;
}
```

## 6. Complete Usage Example

```typescript
import { z } from "zod";

async function main() {
  // 1. Create tool registry and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(calculatorTool);
  toolRegistry.register(weatherTool);

  // 2. Create conversation manager
  const conversation = new ConversationManager();
  conversation.addUserMessage("What is 25 + 17?");

  // 3. Configure agent (using mock provider for demo)
  const mockProvider = createMockProvider();

  const config: AgentConfig = {
    provider: mockProvider,
    maxSteps: 10,
    systemPrompt: "You are a helpful assistant with access to tools.",
    temperature: 0.7,
    toolTimeout: 5000,
    onTextDelta: (text) => process.stdout.write(text),
    onToolCall: (tool, input) => console.log(`\n[Calling ${tool}...]`),
    onToolResult: (tool, result) => console.log(`\n[${tool} result: ${result.output}]`),
    onError: (error) => console.error(`\nError: ${error.message}`),
  };

  // 4. Run agent loop
  const result = await runAgentLoop(
    config,
    conversation,
    toolRegistry,
    new AbortController().signal
  );

  // 5. Print final result
  console.log("\n\n--- Agent Result ---");
  console.log(`Status: ${result.status}`);
  console.log(`Steps completed: ${result.stepsCompleted}`);

  if (result.finalMessage) {
    console.log("\nFinal message parts:");
    for (const part of result.finalMessage.parts) {
      console.log(`  - ${part.type}`);
    }
  }

  if (result.error) {
    console.log(`\nError: ${result.error.message}`);
  }
}

main().catch(console.error);
```

## 7. Advanced Patterns

### 7.1 Doom Loop Detection

Prevent infinite loops when LLM repeatedly calls the same tool with same arguments:

```typescript
class DoomLoopDetector {
  private history: Map<string, unknown[]> = new Map();
  private threshold: number;

  constructor(threshold: number = 3) {
    this.threshold = threshold;
  }

  check(toolName: string, input: unknown): boolean {
    const key = toolName;
    const history = this.history.get(key) || [];

    // Add current input to history
    history.push(JSON.stringify(input));

    // Keep only last N entries
    if (history.length > this.threshold) {
      history.shift();
    }

    this.history.set(key, history);

    // Check if all recent calls are identical
    if (history.length >= this.threshold) {
      const allSame = history.every((h) => h === history[0]);
      if (allSame) {
        return true; // Doom loop detected!
      }
    }

    return false;
  }
}

// Usage in agent loop:
const doomLoopDetector = new DoomLoopDetector();

// Before executing tool:
if (doomLoopDetector.check(toolCall.name, toolCall.input)) {
  throw new Error(
    `Doom loop detected: Tool "${toolCall.name}" called repeatedly with same arguments. ` +
    `Please try a different approach.`
  );
}
```

### 7.2 Retry Logic with Exponential Backoff

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = config.retryableErrors.some(
        (err) => lastError?.message.includes(err)
      );

      if (!isRetryable || attempt === config.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      );

      console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 7.3 Context Compaction

When context window overflows, summarize old messages:

```typescript
interface CompactionConfig {
  maxTokens: number;
  keepRecentMessages: number;
  summarizer: (messages: Message[]) => Promise<string>;
}

async function compactIfNeeded(
  messages: Message[],
  tokenCounter: (text: string) => number,
  config: CompactionConfig
): Promise<Message[]> {
  const totalTokens = messages.reduce(
    (sum, msg) => sum + tokenCounter(JSON.stringify(msg)),
    0
  );

  if (totalTokens <= config.maxTokens) {
    return messages;
  }

  // Keep recent messages
  const recentMessages = messages.slice(-config.keepRecentMessages);
  const oldMessages = messages.slice(0, -config.keepRecentMessages);

  // Summarize old messages
  const summary = await config.summarizer(oldMessages);

  // Create compaction message
  const compactionMessage: UserMessage = {
    id: `compaction_${Date.now()}`,
    role: "user",
    content: `[Previous conversation summary: ${summary}]`,
  };

  return [compactionMessage, ...recentMessages];
}
```

## 8. Comparison with OpenCode Architecture

| Aspect | OpenCode | This Simple Design |
|--------|----------|-------------------|
| **LLM Integration** | Vercel AI SDK with multi-provider | Abstract interface for any provider |
| **Tool Validation** | Zod with custom error formatting | Zod with optional custom formatting |
| **Message Storage** | SQLite with granular parts | In-memory with parts |
| **Streaming** | Full streaming with all event types | Simplified streaming (text, tool_call, done) |
| **Error Handling** | Named errors with retry logic | Basic error handling |
| **Doom Loop** | Built-in detection with threshold | Optional detector class |
| **Compaction** | Built-in with LLM summarization | Optional compaction function |
| **Permissions** | Full permission system | Not included |

## 9. Key Takeaways

1. **Tool System**: The `Tool.define()` pattern with Zod schemas provides type-safe, self-documenting tools
2. **Message Parts**: Breaking messages into granular parts enables rich tracking of conversations
3. **Agentic Loop**: The core pattern is: stream → extract tool calls → execute → append results → repeat
4. **Stop Conditions**: Handle multiple termination reasons gracefully
5. **Extensibility**: Abstract interfaces allow swapping providers, storage, and execution strategies

---

*Generated based on analysis of OpenCode source code (`venders/opencode/packages/opencode/src/`)*
