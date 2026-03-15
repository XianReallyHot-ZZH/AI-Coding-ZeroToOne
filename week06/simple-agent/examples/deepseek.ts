/**
 * DeepSeek Agent Example
 *
 * Demonstrates how to use the agent with DeepSeek API
 *
 * Usage:
 *   # Interactive mode (will prompt for API key)
 *   npm run example:deepseek
 *
 *   # With command line args
 *   npm run example:deepseek -- --api-key YOUR_KEY
 *   npm run example:deepseek -- --api-key YOUR_KEY --model deepseek-coder
 *
 *   # With environment variable
 *   export DEEPSEEK_API_KEY=your-api-key
 *   npm run example:deepseek
 */

import { z } from "zod";
import {
  Agent,
  DeepSeekProvider,
  OpenAIProvider,
  defineTool,
  ToolRegistry,
  loadConfig,
  showConfig,
} from "../src/index.js";

// Define calculator tool
const calculatorTool = defineTool("calculator", {
  description: "Perform basic arithmetic operations (add, subtract, multiply, divide)",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number().describe("First operand"),
    b: z.number().describe("Second operand"),
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
        if (args.b === 0) {
          throw new Error("Division by zero is not allowed");
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
});

// Define a time tool
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
  console.log("=== DeepSeek Agent Example ===\n");

  // Show current config
  showConfig();

  // Load configuration (from CLI args, env, config file, or interactive prompt)
  const config = await loadConfig({ provider: "deepseek" });

  // Create provider based on configuration
  const provider = config.provider === "openai"
    ? new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model || "gpt-4o",
      })
    : new DeepSeekProvider({
        apiKey: config.apiKey,
        model: config.model || "deepseek-chat",
      });

  console.log(`Using provider: ${config.provider}`);
  console.log(`Using model: ${config.model || (config.provider === "openai" ? "gpt-4o" : "deepseek-chat")}\n`);

  // Create tool registry and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(calculatorTool);
  toolRegistry.register(timeTool);

  // Create agent
  const agent = new Agent(
    {
      provider,
      maxSteps: 10,
      systemPrompt:
        "You are a helpful assistant. Use tools when appropriate to help the user.",
      temperature: 0.7,
      toolTimeout: 10000,
      onTextDelta: (text) => process.stdout.write(text),
      onToolCall: (tool, input) => {
        console.log(`\n[Tool: ${tool}]`);
        console.log(`  Input: ${JSON.stringify(input)}`);
      },
      onToolResult: (tool, result) => {
        console.log(`  => ${result.output}`);
      },
      onError: (error) => {
        console.error(`\nError: ${error.message}`);
      },
    },
    toolRegistry
  );

  // Run queries
  const queries = [
    "What is 123 + 456?",
    "What time is it now?",
  ];

  for (const query of queries) {
    console.log(`\n\nUser: ${query}`);
    console.log("Assistant: ");

    const result = await agent.run(query);

    console.log(`\n[Status: ${result.status}, Steps: ${result.stepsCompleted}]`);
  }
}

main().catch(console.error);
