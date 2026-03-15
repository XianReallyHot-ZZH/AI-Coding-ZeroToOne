/**
 * Testing with Mock Provider Example
 *
 * Demonstrates how to test agent behavior without making real API calls
 */

import { z } from "zod";
import {
  Agent,
  MockLLMProvider,
  defineTool,
  ToolRegistry,
  ConversationManager,
} from "../src/index.js";

// Define calculator tool
const calculatorTool = defineTool("calculator", {
  description: "Perform arithmetic operations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
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
        result = args.a / args.b;
        break;
    }
    return {
      title: `${args.a} ${args.operation} ${args.b}`,
      output: `Result: ${result}`,
      metadata: { result },
    };
  },
});

async function main() {
  console.log("=== Testing with Mock Provider Example ===\n");

  // Create mock provider
  const mockProvider = new MockLLMProvider();

  // Queue responses for the test scenario
  // First response: LLM decides to call the calculator tool
  mockProvider.queueToolCallResponse(
    [
      {
        id: "call_1",
        name: "calculator",
        input: { operation: "add", a: 5, b: 3 },
      },
    ],
    "Let me calculate that for you. "
  );

  // Second response: LLM receives tool result and responds
  mockProvider.queueTextResponse(
    "The result of 5 + 3 is 8. Is there anything else you'd like me to calculate?"
  );

  // Create tool registry
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(calculatorTool);

  // Create agent with mock provider
  const agent = new Agent(
    {
      provider: mockProvider,
      maxSteps: 10,
      systemPrompt: "You are a helpful math assistant.",
      onTextDelta: (text) => process.stdout.write(text),
      onToolCall: (tool, input) => {
        console.log(`\n[Tool: ${tool}]`);
        console.log(`  Input: ${JSON.stringify(input)}`);
      },
      onToolResult: (tool, result) => {
        console.log(`  => ${result.output}`);
      },
    },
    toolRegistry
  );

  // Run test
  console.log("User: What is 5 + 3?\n");
  console.log("Assistant: ");

  const result = await agent.run("What is 5 + 3?");

  console.log("\n\n--- Test Result ---");
  console.log(`Status: ${result.status}`);
  console.log(`Steps completed: ${result.stepsCompleted}`);
  console.log(`Provider calls: ${mockProvider.getCallCount()}`);

  // Assertions
  if (result.status !== "completed") {
    console.error("❌ Test failed: Expected status 'completed'");
  } else {
    console.log("✅ Test passed!");
  }
}

main().catch(console.error);
