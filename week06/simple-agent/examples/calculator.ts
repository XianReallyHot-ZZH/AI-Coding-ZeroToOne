/**
 * Calculator Agent Example
 *
 * Demonstrates how to create an agent with a calculator tool
 * that performs basic arithmetic operations
 */

import { z } from "zod";
import { Agent, OpenAIProvider, defineTool, ToolRegistry } from "../src/index.js";

// Define calculator tool with custom validation error formatting
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
  formatValidationError: (error) => {
    return `Calculator requires 'operation' (add/subtract/multiply/divide) and two numbers 'a' and 'b'. ${error.message}`;
  },
});

// Define a more advanced math tool
const advancedMathTool = defineTool("advanced_math", {
  description: "Perform advanced mathematical operations (power, sqrt, percentage)",
  parameters: z.object({
    operation: z.enum(["power", "sqrt", "percentage"]),
    value: z.number().describe("The main value to operate on"),
    secondaryValue: z.number().optional().describe("Secondary value (e.g., exponent for power, percentage value)"),
  }),
  execute: async (args) => {
    let result: number;

    switch (args.operation) {
      case "power":
        result = Math.pow(args.value, args.secondaryValue ?? 2);
        break;
      case "sqrt":
        if (args.value < 0) {
          throw new Error("Cannot calculate square root of negative number");
        }
        result = Math.sqrt(args.value);
        break;
      case "percentage":
        result = (args.value * (args.secondaryValue ?? 100)) / 100;
        break;
    }

    return {
      title: `Advanced math: ${args.operation}`,
      output: `Result: ${result}`,
      metadata: { result },
    };
  },
});

async function main() {
  console.log("=== Calculator Agent Example ===\n");

  // Create provider
  const provider = new OpenAIProvider({
    model: "gpt-4o",
  });

  // Create tool registry and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(calculatorTool);
  toolRegistry.register(advancedMathTool);

  // Create agent
  const agent = new Agent(
    {
      provider,
      maxSteps: 10,
      systemPrompt:
        "You are a math assistant. Use the calculator and advanced_math tools to perform calculations. " +
        "Always show your work by using the tools rather than calculating mentally.",
      temperature: 0.3, // Lower temperature for more precise responses
      toolTimeout: 5000,
      onTextDelta: (text) => process.stdout.write(text),
      onToolCall: (tool, input) => {
        console.log(`\n[Tool: ${tool}]`);
        console.log(`  Args: ${JSON.stringify(input)}`);
      },
      onToolResult: (tool, result) => {
        console.log(`  => ${result.output}`);
      },
    },
    toolRegistry
  );

  // Run multiple queries
  const queries = [
    "What is 25 + 17?",
    "Calculate 100 divided by 4, then multiply the result by 3",
    "What is 2 to the power of 8?",
  ];

  for (const query of queries) {
    console.log(`\n\nUser: ${query}`);
    console.log("Assistant: ");

    const result = await agent.run(query);

    console.log(`\n[Status: ${result.status}, Steps: ${result.stepsCompleted}]`);
  }
}

main().catch(console.error);
