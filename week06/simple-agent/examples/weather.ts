/**
 * Weather Agent Example
 *
 * Demonstrates how to create an agent with a weather tool
 * that fetches weather information for different locations
 */

import { z } from "zod";
import { Agent, OpenAIProvider, defineTool, ToolRegistry } from "../src/index.js";

// Mock weather data
const mockWeatherData: Record<string, { temp: number; condition: string; humidity: number }> = {
  "new york": { temp: 22, condition: "Partly cloudy", humidity: 65 },
  "london": { temp: 15, condition: "Rainy", humidity: 80 },
  "tokyo": { temp: 28, condition: "Sunny", humidity: 55 },
  "sydney": { temp: 25, condition: "Clear", humidity: 50 },
  "beijing": { temp: 20, condition: "Hazy", humidity: 70 },
  "paris": { temp: 18, condition: "Overcast", humidity: 75 },
};

// Define weather tool
const weatherTool = defineTool("get_weather", {
  description: "Get current weather information for a specific location",
  parameters: z.object({
    location: z.string().describe("City name (e.g., 'New York', 'London', 'Tokyo')"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
  }),
  execute: async (args) => {
    const location = args.location.toLowerCase();
    const data = mockWeatherData[location];

    if (!data) {
      return {
        title: `Weather for ${args.location}`,
        output: `Weather data not available for "${args.location}". Available cities: ${Object.keys(mockWeatherData).join(", ")}`,
      };
    }

    const temp = args.unit === "fahrenheit"
      ? Math.round(data.temp * 9 / 5 + 32)
      : data.temp;

    const weatherInfo = {
      location: args.location,
      temperature: `${temp}°${args.unit === "fahrenheit" ? "F" : "C"}`,
      condition: data.condition,
      humidity: `${data.humidity}%`,
    };

    return {
      title: `Weather in ${args.location}`,
      output: JSON.stringify(weatherInfo, null, 2),
      metadata: weatherInfo,
    };
  },
});

// Define a temperature comparison tool
const compareTempTool = defineTool("compare_temperatures", {
  description: "Compare temperatures between two cities",
  parameters: z.object({
    city1: z.string().describe("First city name"),
    city2: z.string().describe("Second city name"),
  }),
  execute: async (args) => {
    const data1 = mockWeatherData[args.city1.toLowerCase()];
    const data2 = mockWeatherData[args.city2.toLowerCase()];

    if (!data1 || !data2) {
      const available = Object.keys(mockWeatherData).join(", ");
      return {
        title: "Temperature Comparison",
        output: `One or both cities not found. Available: ${available}`,
      };
    }

    const diff = Math.abs(data1.temp - data2.temp);
    const warmer = data1.temp > data2.temp ? args.city1 : args.city2;

    return {
      title: `${args.city1} vs ${args.city2}`,
      output: `${args.city1}: ${data1.temp}°C, ${args.city2}: ${data2.temp}°C. ${warmer} is warmer by ${diff}°C.`,
      metadata: { diff, warmer },
    };
  },
});

async function main() {
  console.log("=== Weather Agent Example ===\n");

  // Create provider
  const provider = new OpenAIProvider({
    model: "gpt-4o",
  });

  // Create tool registry and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(weatherTool);
  toolRegistry.register(compareTempTool);

  // Create agent
  const agent = new Agent(
    {
      provider,
      maxSteps: 10,
      systemPrompt:
        "You are a weather assistant. Help users get weather information using the available tools. " +
        "When comparing temperatures, use the compare_temperatures tool.",
      temperature: 0.5,
      toolTimeout: 5000,
      onTextDelta: (text) => process.stdout.write(text),
      onToolCall: (tool, input) => {
        console.log(`\n[Tool: ${tool}]`);
      },
      onToolResult: (tool, result) => {
        console.log(`  => ${result.output}`);
      },
    },
    toolRegistry
  );

  // Run queries
  const queries = [
    "What's the weather like in Tokyo?",
    "Compare the temperature between London and Sydney",
    "I'm planning a trip. Which is warmer: Paris or New York?",
  ];

  for (const query of queries) {
    console.log(`\n\nUser: ${query}`);
    console.log("Assistant: ");

    const result = await agent.run(query);

    console.log(`\n[Status: ${result.status}]`);
  }
}

main().catch(console.error);
