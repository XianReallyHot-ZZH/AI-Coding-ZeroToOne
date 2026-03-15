/**
 * Basic Agent Example
 *
 * Demonstrates how to create a simple agent with custom tools
 */

import { z } from "zod";
import {
  Agent,
  OpenAIProvider,
  defineTool,
  ToolRegistry,
  ConversationManager,
} from "../src/index.js";

// Define a simple echo tool
const echoTool = defineTool("echo", {
  description: "Echo back the input message",
  parameters: z.object({
    message: z.string().describe("The message to echo back"),
  }),
  execute: async (args) => {
    return {
      title: "Echo",
      output: `Echo: ${args.message}`,
    };
  },
});

// Define a current time tool
const timeTool = defineTool("get_current_time", {
  description: "Get the current date and time",
  parameters: z.object({}),
  execute: async () => {
    const now = new Date();
    return {
      title: "Current Time",
      output: `Current time: ${now.toISOString()}`,
      metadata: { timestamp: now.getTime() },
    };
  },
});

async function main() {
  console.log("=== Basic Agent Example ===\n");

  // Create provider
  const provider = new OpenAIProvider({
    model: "gpt-4o",
  });

  // Create tool registry and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(echoTool);
  toolRegistry.register(timeTool);

  // Create conversation manager
  const conversation = new ConversationManager();

  // Create agent with callbacks
  const agent = new Agent(
    {
      provider,
      maxSteps: 10,
      systemPrompt: "You are a helpful assistant. Use tools when appropriate.",
      temperature: 0.7,
      toolTimeout: 5000,
      onTextDelta: (text) => process.stdout.write(text),
      onToolCall: (tool, input) => {
        console.log(`\n[Calling tool: ${tool}]`);
        console.log(`  Input: ${JSON.stringify(input)}`);
      },
      onToolResult: (tool, result) => {
        console.log(`\n[Tool result: ${tool}]`);
        console.log(`  Output: ${result.output}`);
      },
      onError: (error) => {
        console.error(`\nError: ${error.message}`);
      },
    },
    toolRegistry,
    conversation
  );

  // Run agent
  console.log("User: What time is it now?\n");
  console.log("Assistant: ");

  const result = await agent.run("What time is it now?");

  console.log("\n\n--- Result ---");
  console.log(`Status: ${result.status}`);
  console.log(`Steps completed: ${result.stepsCompleted}`);

  if (result.error) {
    console.log(`Error: ${result.error.message}`);
  }
}

main().catch(console.error);
