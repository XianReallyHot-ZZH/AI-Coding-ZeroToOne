/**
 * CodeReview Agent
 *
 * An AI-powered code review agent built on top of simple-agent.
 */

// Agent factory
export { createCodeReviewAgent, runCodeReview } from "./agent.js";
export type { CodeReviewAgentConfig, ProviderType } from "./agent.js";

// Tools
export {
  readFileTool,
  writeFileTool,
  gitCommandTool,
  ghCommandTool,
} from "./tools/index.js";

// Utilities
export {
  detectMainBranch,
  getCurrentBranch,
  isGitRepository,
} from "./utils/index.js";

// Re-export simple-agent types for convenience
export {
  Agent,
  ConversationManager,
  ToolRegistry,
  type AgentLoopResult,
  type ToolResult,
} from "simple-agent";
