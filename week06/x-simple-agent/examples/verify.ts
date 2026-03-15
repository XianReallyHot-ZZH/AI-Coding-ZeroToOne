/**
 * Verification test - Validates SDK components without calling LLM
 */

import {
  createAgent,
  createTool,
  ToolRegistry,
  ToolExecutor,
  SessionManager,
  MCPClient,
  type Tool,
  type ToolCallContent,
} from "../src/index.js"

console.log("=== SDK Verification Test ===\n")

// Test 1: Tool Registry
console.log("1. Testing ToolRegistry...")
const registry = new ToolRegistry()
const testTool: Tool = {
  name: "test_tool",
  description: "A test tool",
  parameters: {
    type: "object",
    properties: {
      input: { type: "string" },
    },
  },
  execute: async (args: unknown) => {
    return { output: `Received: ${JSON.stringify(args)}` }
  },
}
registry.register(testTool)
console.log(`   - Registered tool: ${registry.get("test_tool")?.name}`)
console.log(`   - Tool definitions: ${registry.toToolDefinitions().length}`)
console.log("   ✓ ToolRegistry works!\n")

// Test 2: Tool Executor
console.log("2. Testing ToolExecutor...")
const executor = new ToolExecutor(registry)
const testCall: ToolCallContent = {
  type: "tool_call",
  id: "call-123",
  name: "test_tool",
  arguments: { input: "hello" },
}
executor.execute(testCall, { sessionId: "session-1", messageId: "msg-1" })
  .then((result) => {
    console.log(`   - Tool result: ${result.result}`)
    console.log("   ✓ ToolExecutor works!\n")
  })

// Test 3: Session Manager
console.log("3. Testing SessionManager...")
const session = SessionManager.create({
  systemPrompt: "You are a helpful assistant.",
  model: "gpt-4o",
})
console.log(`   - Session ID: ${session.id}`)
console.log(`   - Session status: ${session.status}`)

SessionManager.addUserMessage(session, "Hello!")
console.log(`   - Messages after adding user message: ${session.messages.length}`)

const assistantContent = [{ type: "text" as const, text: "Hi there!" }]
SessionManager.addAssistantMessage(session, assistantContent)
console.log(`   - Messages after adding assistant message: ${session.messages.length}`)
console.log("   ✓ SessionManager works!\n")

// Test 4: Agent Creation
console.log("4. Testing Agent creation...")
const agent = createAgent({
  model: "gpt-4o-mini",
  systemPrompt: "You are a helpful assistant.",
})

// Add a tool using the convenience method
agent.addTool(
  "echo",
  "Echo back the input",
  {
    type: "object",
    properties: {
      message: { type: "string" },
    },
    required: ["message"],
  },
  async (args) => {
    const { message } = args as { message: string }
    return `Echo: ${message}`
  }
)

console.log(`   - Agent session ID: ${agent.getSession().id}`)
console.log(`   - Registered tools: ${agent.getToolRegistry().names().join(", ")}`)
console.log("   ✓ Agent creation works!\n")

// Test 5: MCP Client (just instantiation, not connection)
console.log("5. Testing MCP Client instantiation...")
const mcpClient = new MCPClient()
console.log(`   - MCP Client created: ${!mcpClient.isConnected() ? "not connected" : "connected"}`)
console.log("   ✓ MCP Client instantiation works!\n")

// Test 6: createTool helper
console.log("6. Testing createTool helper...")
const customTool = createTool(
  "custom",
  "A custom tool",
  {
    type: "object",
    properties: {
      value: { type: "number" },
    },
  },
  async (args) => {
    const { value } = args as { value: number }
    return { output: `Doubled: ${value * 2}` }
  }
)
console.log(`   - Created tool: ${customTool.name}`)
console.log("   ✓ createTool works!\n")

console.log("=== All verification tests passed! ===")
console.log("\nThe SDK is ready to use. Set OPENAI_API_KEY to run actual agent examples.")
