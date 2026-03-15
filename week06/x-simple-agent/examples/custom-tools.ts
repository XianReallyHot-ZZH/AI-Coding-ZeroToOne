/**
 * Custom tools example
 *
 * Demonstrates how to create and register custom tools
 */

import "dotenv/config"
import { createAgent, createTool, type Tool } from "../src/index.js"

// Method 1: Using createTool helper
const weatherTool = createTool(
  "get_weather",
  "Get the current weather for a location",
  {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city name, e.g., Tokyo, New York",
      },
      unit: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        description: "Temperature unit",
      },
    },
    required: ["location"],
  },
  async (args) => {
    const { location, unit = "celsius" } = args as { location: string; unit?: string }

    // Simulated weather data
    const weatherData: Record<string, { temp: number; condition: string }> = {
      tokyo: { temp: 22, condition: "Sunny" },
      "new york": { temp: 18, condition: "Cloudy" },
      london: { temp: 14, condition: "Rainy" },
      paris: { temp: 16, condition: "Partly cloudy" },
      sydney: { temp: 25, condition: "Clear" },
    }

    const key = location.toLowerCase()
    const data = weatherData[key] ?? { temp: 20, condition: "Unknown" }

    const temp = unit === "fahrenheit"
      ? Math.round(data.temp * 9 / 5 + 32)
      : data.temp

    return {
      output: `Weather in ${location}: ${data.condition}, ${temp}°${unit === "fahrenheit" ? "F" : "C"}`,
    }
  }
)

// Method 2: Using the addTool convenience method
function createCalculatorAgent() {
  const agent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: "You are a helpful assistant with access to tools. Use them when needed.",
  })

  // Add a simple tool using the convenience method
  agent.addTool(
    "calculate",
    "Perform basic arithmetic operations",
    {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "A mathematical expression to evaluate, e.g., '2 + 2' or '10 * 5'",
        },
      },
      required: ["expression"],
    },
    async (args) => {
      const { expression } = args as { expression: string }

      try {
        // Safe evaluation using Function constructor (limited scope)
        // Note: In production, use a proper expression parser
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "")
        const result = new Function(`return ${sanitized}`)()

        return `Result: ${expression} = ${result}`
      } catch {
        return { output: "", error: `Invalid expression: ${expression}` }
      }
    }
  )

  return agent
}

async function main() {
  console.log("=== Custom Tools Example ===\n")

  // Example 1: Weather tool
  console.log("--- Example 1: Weather Tool ---")
  const weatherAgent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: "You are a helpful weather assistant. Use the get_weather tool to answer questions about weather.",
    tools: [weatherTool],
  })

  console.log("User: What's the weather like in Tokyo and London?")
  await weatherAgent.run("What's the weather like in Tokyo and London?")
  console.log("\nAssistant:", weatherAgent.getLastResponse())

  console.log("\n" + "=".repeat(50) + "\n")

  // Example 2: Calculator tool
  console.log("--- Example 2: Calculator Tool ---")
  const calcAgent = createCalculatorAgent()

  console.log("User: Calculate 123 * 456 and tell me the result")
  await calcAgent.run("Calculate 123 * 456 and tell me the result")
  console.log("\nAssistant:", calcAgent.getLastResponse())

  console.log("\n" + "=".repeat(50) + "\n")

  // Example 3: Multiple tools working together
  console.log("--- Example 3: Multiple Tools ---")
  const multiAgent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: "You are a helpful assistant with multiple tools. Use them as needed.",
    tools: [weatherTool],
  })

  multiAgent.addTool(
    "convert_currency",
    "Convert an amount from one currency to another",
    {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount to convert" },
        from: { type: "string", description: "Source currency code (USD, EUR, JPY)" },
        to: { type: "string", description: "Target currency code (USD, EUR, JPY)" },
      },
      required: ["amount", "from", "to"],
    },
    async (args) => {
      const { amount, from, to } = args as { amount: number; from: string; to: string }

      // Simulated exchange rates (USD base)
      const rates: Record<string, number> = {
        USD: 1,
        EUR: 0.85,
        JPY: 110,
        GBP: 0.75,
      }

      const fromRate = rates[from.toUpperCase()] ?? 1
      const toRate = rates[to.toUpperCase()] ?? 1
      const result = (amount / fromRate) * toRate

      return `${amount} ${from} = ${result.toFixed(2)} ${to}`
    }
  )

  console.log("User: I'm planning a trip. Convert 100 USD to JPY, and tell me the weather in Tokyo.")
  await multiAgent.run("I'm planning a trip. Convert 100 USD to JPY, and tell me the weather in Tokyo.")
  console.log("\nAssistant:", multiAgent.getLastResponse())
}

main().catch(console.error)
