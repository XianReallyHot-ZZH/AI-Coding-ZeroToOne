#!/usr/bin/env node
/**
 * CodeReview Agent CLI
 *
 * Command-line interface for running code reviews.
 * Supports multiple LLM providers: OpenAI, DeepSeek, and OpenAI-compatible APIs.
 */

import { Command } from "commander";
import { createCodeReviewAgent, type ProviderType } from "./agent.js";
import { detectMainBranch, isGitRepository } from "./utils/index.js";

const program = new Command();

/**
 * Default models for each provider.
 */
const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: "gpt-4o",
  deepseek: "deepseek-chat",
  "openai-compatible": "gpt-4o",
};

program
  .name("codereview")
  .description("AI-powered code review agent")
  .version("1.0.0")
  .argument("[target]", "审查目标（分支名、提交hash、PR号等）")
  .option("-b, --base <branch>", "基准分支，默认自动检测主分支")
  .option("-o, --output <file>", "输出报告到文件")
  .option(
    "-p, --provider <provider>",
    "LLM 提供商: openai, deepseek, openai-compatible",
    "openai"
  )
  .option(
    "-m, --model <model>",
    "使用的模型（默认: openai=gpt-4o, deepseek=deepseek-chat）"
  )
  .option(
    "--base-url <url>",
    "API Base URL（用于 openai-compatible 或自定义端点）"
  )
  .option("--api-key <key>", "API Key（也可通过环境变量设置）")
  .option("--json", "以 JSON 格式输出")
  .option("--interactive, -i", "交互模式，支持多轮对话", false)
  .action(async (target, options) => {
    try {
      // Validate provider
      const provider = options.provider as ProviderType;
      if (!["openai", "deepseek", "openai-compatible"].includes(provider)) {
        console.error(
          `错误: 不支持的 provider "${provider}"。支持: openai, deepseek, openai-compatible`
        );
        process.exit(1);
      }

      // Check if base-url is required
      if (provider === "openai-compatible" && !options.baseUrl) {
        console.error("错误: 使用 'openai-compatible' provider 时必须指定 --base-url");
        process.exit(1);
      }

      // Check if we're in a git repository
      if (!(await isGitRepository())) {
        console.error("错误: 当前目录不是 git 仓库");
        process.exit(1);
      }

      // Determine the base branch
      const baseBranch = options.base || (await detectMainBranch());

      // Determine model
      const model = options.model || DEFAULT_MODELS[provider];

      // Build the review message
      let message: string;

      if (target) {
        // Parse the target to determine review type
        if (target.startsWith("pr:") || target.match(/^\d+$/)) {
          // PR review
          const prNumber = target.replace(/^pr:/, "");
          message = `帮我审查 pull request ${prNumber}`;
        } else if (target.includes("..")) {
          // Commit range
          message = `帮我审查 ${target} 之间的代码变更`;
        } else if (target.match(/^[a-f0-9]{7,40}$/i)) {
          // Commit hash
          message = `帮我审查提交 ${target}`;
        } else if (target.includes("*") || target.includes("/")) {
          // File pattern
          message = `帮我审查文件 ${target}`;
        } else {
          // Assume it's a branch name
          message = `帮我审查分支 ${target} 相对于 ${baseBranch} 的代码变更`;
        }
      } else {
        // Default: review uncommitted changes or branch diff
        message = `帮我审查当前的代码变更。基准分支是 ${baseBranch}`;
      }

      // Create and run the agent
      const { agent } = createCodeReviewAgent({
        provider,
        model,
        apiKey: options.apiKey,
        baseURL: options.baseUrl,
        onTextDelta: (text) => process.stdout.write(text),
        onToolCall: (tool, input) => {
          console.log(`\n[调用工具: ${tool}]`);
          console.log(`  参数: ${JSON.stringify(input)}`);
        },
        onToolResult: (tool, result) => {
          const preview =
            result.output.length > 100
              ? result.output.slice(0, 100) + "..."
              : result.output;
          console.log(`  结果: ${preview}`);
        },
      });

      console.log(`\n=== CodeReview Agent ===\n`);
      console.log(`Provider: ${provider}`);
      console.log(`Model: ${model}`);
      console.log(`基准分支: ${baseBranch}`);
      console.log(`\n用户: ${message}\n`);
      console.log("助手: ");

      const result = await agent.run(message);

      console.log("\n\n--- 审查完成 ---");
      console.log(`状态: ${result.status}`);
      console.log(`完成步骤: ${result.stepsCompleted}`);

      if (result.error) {
        console.log(`错误: ${result.error.message}`);
        process.exit(1);
      }

      // Handle interactive mode
      if (options.interactive) {
        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        console.log("\n=== 交互模式 ===");
        console.log("输入 'exit' 或 'quit' 退出\n");

        const askQuestion = () => {
          rl.question("用户: ", async (input) => {
            const trimmed = input.trim();

            if (
              trimmed.toLowerCase() === "exit" ||
              trimmed.toLowerCase() === "quit"
            ) {
              rl.close();
              return;
            }

            if (!trimmed) {
              askQuestion();
              return;
            }

            console.log("\n助手: ");
            const result = await agent.run(trimmed);
            console.log("\n");

            if (result.status === "error") {
              console.log(`错误: ${result.error?.message}`);
            }

            askQuestion();
          });
        };

        askQuestion();
      }
    } catch (error) {
      console.error(
        `\n错误: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
