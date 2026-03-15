/**
 * CodeReview Agent Factory
 *
 * Creates and configures a CodeReview Agent instance.
 * Supports multiple LLM providers: OpenAI, DeepSeek, and custom OpenAI-compatible APIs.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  Agent,
  OpenAIProvider,
  DeepSeekProvider,
  ToolRegistry,
  ConversationManager,
} from "simple-agent";
import type { LLMProvider } from "simple-agent";
import {
  readFileTool,
  writeFileTool,
  gitCommandTool,
  ghCommandTool,
} from "./tools/index.js";

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Supported LLM providers.
 */
export type ProviderType = "openai" | "deepseek" | "openai-compatible";

/**
 * Configuration options for creating a CodeReview Agent.
 */
export interface CodeReviewAgentConfig {
  /** LLM provider type: "openai", "deepseek", or "openai-compatible" */
  provider?: ProviderType;
  /** API key (defaults to provider-specific env var) */
  apiKey?: string;
  /** Model to use */
  model?: string;
  /** Base URL for API (for custom endpoints) */
  baseURL?: string;
  /** Maximum number of agent steps */
  maxSteps?: number;
  /** Temperature for responses */
  temperature?: number;
  /** Callback for text streaming */
  onTextDelta?: (text: string) => void;
  /** Callback for tool calls */
  onToolCall?: (tool: string, input: unknown) => void;
  /** Callback for tool results */
  onToolResult?: (tool: string, result: { output: string }) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Default models for each provider.
 */
const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: "gpt-4o",
  deepseek: "deepseek-chat",
  "openai-compatible": "gpt-4o",
};

/**
 * Environment variable names for each provider's API key.
 */
const API_KEY_ENV_VARS: Record<ProviderType, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  "openai-compatible": "OPENAI_API_KEY",
};

/**
 * Creates an LLM provider based on the configuration.
 */
function createProvider(config: CodeReviewAgentConfig): LLMProvider {
  const providerType = config.provider ?? "openai";
  const model = config.model ?? DEFAULT_MODELS[providerType];
  const apiKey = config.apiKey ?? process.env[API_KEY_ENV_VARS[providerType]];

  switch (providerType) {
    case "openai":
      return new OpenAIProvider({
        apiKey,
        model,
        baseURL: config.baseURL,
      });

    case "deepseek":
      return new DeepSeekProvider({
        apiKey,
        model,
      });

    case "openai-compatible":
      if (!config.baseURL) {
        throw new Error(
          "baseURL is required when using 'openai-compatible' provider"
        );
      }
      return new OpenAIProvider({
        apiKey,
        model,
        baseURL: config.baseURL,
      });

    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }
}

/**
 * Creates a CodeReview Agent instance with all necessary tools and configuration.
 *
 * @param config - Configuration options
 * @returns Configured Agent instance and conversation manager
 */
export function createCodeReviewAgent(config: CodeReviewAgentConfig = {}): {
  agent: Agent;
  conversation: ConversationManager;
} {
  // Load system prompt from prompts/system.md
  const promptsDir = join(__dirname, "..", "prompts");
  const systemPrompt = readFileSync(join(promptsDir, "system.md"), "utf-8");

  // Create provider
  const provider = createProvider(config);

  // Register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(readFileTool);
  toolRegistry.register(writeFileTool);
  toolRegistry.register(gitCommandTool);
  toolRegistry.register(ghCommandTool);

  // Create conversation manager
  const conversation = new ConversationManager();

  // Create agent with callbacks
  const agent = new Agent(
    {
      provider,
      maxSteps: config.maxSteps ?? 50, // Code review may need multiple tool calls
      systemPrompt,
      temperature: config.temperature ?? 0.3, // Lower temperature for stable output
      toolTimeout: 60000, // git commands may be slow
      onTextDelta:
        config.onTextDelta ?? ((text: string) => process.stdout.write(text)),
      onToolCall:
        config.onToolCall ??
        ((tool: string, input: unknown) => {
          console.log(`\n[调用工具: ${tool}]`);
          console.log(`  参数: ${JSON.stringify(input)}`);
        }),
      onToolResult:
        config.onToolResult ??
        ((tool: string, result: { output: string }) => {
          const preview =
            result.output.length > 100
              ? result.output.slice(0, 100) + "..."
              : result.output;
          console.log(`  结果: ${preview}`);
        }),
      onError:
        config.onError ??
        ((error: Error) => {
          console.error(`\n[错误]: ${error.message}`);
        }),
    },
    toolRegistry,
    conversation
  );

  return { agent, conversation };
}

/**
 * Runs a code review with the given message.
 *
 * @param message - The review request message
 * @param config - Agent configuration
 * @returns The agent loop result
 */
export async function runCodeReview(
  message: string,
  config: CodeReviewAgentConfig = {}
): Promise<{
  status: "completed" | "max_steps" | "error" | "aborted";
  stepsCompleted: number;
  error?: Error;
}> {
  const { agent } = createCodeReviewAgent(config);

  const providerInfo = config.provider ?? "openai";
  const modelInfo = config.model ?? (config.provider === "deepseek" ? "deepseek-chat" : "gpt-4o");

  console.log(`\n用户: ${message}\n`);
  console.log(`Provider: ${providerInfo}`);
  console.log(`Model: ${modelInfo}\n`);
  console.log("助手: ");

  const result = await agent.run(message);

  console.log("\n\n--- 审查结果 ---");
  console.log(`状态: ${result.status}`);
  console.log(`完成步骤: ${result.stepsCompleted}`);

  if (result.error) {
    console.log(`错误: ${result.error.message}`);
  }

  return result;
}
