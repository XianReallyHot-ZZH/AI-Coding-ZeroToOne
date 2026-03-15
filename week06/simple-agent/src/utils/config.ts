import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// ============================================
// Configuration Types
// ============================================

export interface RuntimeConfig {
  provider: "deepseek" | "openai";
  apiKey: string;
  model?: string;
}

// ============================================
// API Key Configuration
// ============================================

const CONFIG_FILE = ".simple-agent.json";

/**
 * Load configuration from multiple sources with priority:
 * 1. Command line args: --api-key, --provider, --model
 * 2. Environment variables: DEEPSEEK_API_KEY, OPENAI_API_KEY
 * 3. Config file: .simple-agent.json in current directory
 * 4. Interactive prompt
 */
export async function loadConfig(
  options: {
    provider?: "deepseek" | "openai";
    requireApiKey?: boolean;
  } = {}
): Promise<RuntimeConfig> {
  const { provider = "deepseek", requireApiKey = true } = options;

  // 1. Check command line args
  const cliConfig = parseCliArgs();
  if (cliConfig.apiKey) {
    return {
      provider: cliConfig.provider || provider,
      apiKey: cliConfig.apiKey,
      model: cliConfig.model,
    };
  }

  // 2. Check environment variables
  const envConfig = getEnvConfig(provider);
  if (envConfig.apiKey) {
    return {
      provider,
      apiKey: envConfig.apiKey,
      model: envConfig.model,
    };
  }

  // 3. Check config file
  const fileConfig = loadConfigFile();
  if (fileConfig?.apiKey) {
    return {
      provider: fileConfig.provider || provider,
      apiKey: fileConfig.apiKey,
      model: fileConfig.model,
    };
  }

  // 4. Interactive prompt
  if (requireApiKey) {
    console.log("\n📝 No API key found. Please configure your API key.\n");
    console.log("You can set it via:");
    console.log("  - Command line: --api-key YOUR_KEY");
    console.log("  - Environment:  DEEPSEEK_API_KEY or OPENAI_API_KEY");
    console.log("  - Config file:  .simple-agent.json");
    console.log("\nOr enter it now (will be saved to .simple-agent.json):\n");

    const apiKey = await promptInput("API Key: ");
    const selectedProvider = await promptProvider(provider);
    const selectedModel = await promptModel(selectedProvider);

    // Save to config file
    saveConfigFile({
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
    });

    console.log("\n✅ Configuration saved to .simple-agent.json\n");

    return {
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
    };
  }

  return {
    provider,
    apiKey: "",
  };
}

// ============================================
// CLI Argument Parsing
// ============================================

function parseCliArgs(): Partial<RuntimeConfig> {
  const args = process.argv.slice(2);
  const config: Partial<RuntimeConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--api-key" || arg === "-k") {
      config.apiKey = args[++i];
    } else if (arg === "--provider" || arg === "-p") {
      config.provider = args[++i] as "deepseek" | "openai";
    } else if (arg === "--model" || arg === "-m") {
      config.model = args[++i];
    } else if (arg.startsWith("--api-key=")) {
      config.apiKey = arg.split("=")[1];
    } else if (arg.startsWith("--provider=")) {
      config.provider = arg.split("=")[1] as "deepseek" | "openai";
    } else if (arg.startsWith("--model=")) {
      config.model = arg.split("=")[1];
    }
  }

  return config;
}

// ============================================
// Environment Variables
// ============================================

function getEnvConfig(provider: "deepseek" | "openai"): Partial<RuntimeConfig> {
  if (provider === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey) {
      return { apiKey, model: process.env.DEEPSEEK_MODEL };
    }
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      return { apiKey, model: process.env.OPENAI_MODEL };
    }
  }

  // Try both if provider not specified
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (deepseekKey) {
    return { apiKey: deepseekKey, provider: "deepseek" };
  }
  if (openaiKey) {
    return { apiKey: openaiKey, provider: "openai" };
  }

  return {};
}

// ============================================
// Config File
// ============================================

function loadConfigFile(): Partial<RuntimeConfig> | null {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

function saveConfigFile(config: RuntimeConfig): void {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Add to .gitignore if exists
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, "utf-8");
      if (!gitignore.includes(CONFIG_FILE)) {
        fs.appendFileSync(gitignorePath, `\n# Simple Agent config\n${CONFIG_FILE}\n`);
      }
    }
  } catch (error) {
    console.error("Failed to save config file:", error);
  }
}

// ============================================
// Interactive Prompts
// ============================================

function promptInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptProvider(defaultProvider: string): Promise<"deepseek" | "openai"> {
  console.log("\nSelect provider:");
  console.log("  1. DeepSeek (recommended)");
  console.log("  2. OpenAI");

  const choice = await promptInput(`Choice [1-2] (default: ${defaultProvider === "deepseek" ? "1" : "2"}): `);

  if (choice === "2") return "openai";
  return "deepseek";
}

async function promptModel(provider: string): Promise<string | undefined> {
  const models: Record<string, string[]> = {
    deepseek: ["deepseek-chat", "deepseek-coder"],
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  };

  const availableModels = models[provider] || [];
  if (availableModels.length === 0) return undefined;

  console.log(`\nSelect model for ${provider}:`);
  availableModels.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));

  const choice = await promptInput(`Choice [1-${availableModels.length}] (default: 1): `);
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < availableModels.length) {
    return availableModels[index];
  }
  return availableModels[0];
}

// ============================================
// Show Current Config
// ============================================

export function showConfig(): void {
  console.log("\n📋 Current Configuration:\n");

  // CLI args
  const cliConfig = parseCliArgs();
  if (Object.keys(cliConfig).length > 0) {
    console.log("Command line args:");
    console.log(`  --api-key: ${cliConfig.apiKey ? "***" + cliConfig.apiKey.slice(-4) : "not set"}`);
    console.log(`  --provider: ${cliConfig.provider || "not set"}`);
    console.log(`  --model: ${cliConfig.model || "not set"}`);
    console.log();
  }

  // Environment
  console.log("Environment variables:");
  console.log(`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? "***" + process.env.DEEPSEEK_API_KEY.slice(-4) : "not set"}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "***" + process.env.OPENAI_API_KEY.slice(-4) : "not set"}`);
  console.log();

  // Config file
  const fileConfig = loadConfigFile();
  if (fileConfig) {
    console.log("Config file (.simple-agent.json):");
    console.log(`  provider: ${fileConfig.provider || "not set"}`);
    console.log(`  apiKey: ${fileConfig.apiKey ? "***" + fileConfig.apiKey.slice(-4) : "not set"}`);
    console.log(`  model: ${fileConfig.model || "not set"}`);
  } else {
    console.log("Config file: not found");
  }
  console.log();
}
