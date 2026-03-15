# CodeReview Agent 设计文档

## 1. 概述

CodeReview Agent 是一个专门用于代码审查的智能代理，能够根据用户的各种需求（分支对比、提交对比、PR 审查等）自动收集代码变更并进行深度分析。

### 1.1 设计目标

- **灵活性**：支持多种审查场景（分支、提交、PR、文件等）
- **准确性**：通过完整读取文件内容理解上下文，而非仅依赖 diff
- **可扩展性**：基于 simple-agent 框架构建，易于扩展新工具和能力
- **易用性**：自然语言交互，用户无需记忆复杂命令

### 1.2 核心能力

- 自动解析用户意图，确定审查范围
- 智能收集代码变更上下文
- 深度分析代码质量、潜在 bug、安全问题
- 输出结构化的审查报告

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        CodeReview Agent                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   System    │    │    Tool     │    │    LLM Provider     │ │
│  │   Prompt    │───▶│   Registry  │───▶│   (OpenAI/etc)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                  │                      │             │
│         ▼                  ▼                      ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Agent Core (simple-agent)               ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ ││
│  │  │ Conversation  │  │    Tool       │  │   Agent Loop    │ ││
│  │  │   Manager     │  │   Executor    │  │   (Agentic)     │ ││
│  │  └───────────────┘  └───────────────┘  └─────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Tools Layer                          ││
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐ ││
│  │  │read_file│  │write_file│  │git_command│  │ gh_command  │ ││
│  │  └─────────┘  └──────────┘  └───────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     File System / Git / GitHub CLI          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 基于 simple-agent 框架

复用 `week06/simple-agent` 的核心组件：

| 组件 | 来源 | 用途 |
|------|------|------|
| `Agent` | `src/agent.ts` | Agent 主循环，处理 LLM 交互和工具调用 |
| `ToolRegistry` | `src/tool.ts` | 工具注册和管理 |
| `ToolExecutor` | `src/executor.ts` | 工具执行，带超时控制 |
| `ConversationManager` | `src/conversation.ts` | 对话历史管理 |
| `defineTool` | `src/tool.ts` | 工具定义辅助函数 |
| `OpenAIProvider` | `src/providers/openai.ts` | LLM 提供者 |

---

## 3. 工具设计

### 3.1 read_file 工具

读取指定文件的内容，支持相对路径和绝对路径。

**Schema 定义：**

```typescript
const readFileTool = defineTool("read_file", {
  description: `读取指定文件的内容。

使用场景：
- 读取变更文件的完整内容以理解上下文
- 查看 AGENTS.md、CLAUDE.md 等项目规范文件
- 查看相关依赖文件理解代码关系

参数说明：
- path: 文件路径，相对于工作目录或绝对路径

返回：文件内容字符串，如果文件不存在则返回错误信息。`,
  parameters: z.object({
    path: z.string().describe("要读取的文件路径"),
  }),
  execute: async (args, context) => {
    // 实现见后文
  },
});
```

**使用示例（LLM 调用）：**

```json
{
  "name": "read_file",
  "input": {
    "path": "src/auth/login.ts"
  }
}
```

### 3.2 write_file 工具

写入内容到指定文件，用于生成审查报告或修复建议。

**Schema 定义：**

```typescript
const writeFileTool = defineTool("write_file", {
  description: `写入内容到指定文件。

使用场景：
- 生成代码审查报告
- 保存修复建议或代码补丁
- 创建文档记录发现的问题

参数说明：
- path: 目标文件路径
- content: 要写入的内容

注意：如果文件已存在，将会被覆盖。`,
  parameters: z.object({
    path: z.string().describe("目标文件路径"),
    content: z.string().describe("要写入的文件内容"),
  }),
  execute: async (args, context) => {
    // 实现见后文
  },
});
```

**使用示例（LLM 调用）：**

```json
{
  "name": "write_file",
  "input": {
    "path": "code-review-report.md",
    "content": "# Code Review Report\n\n## Critical Issues\n..."
  }
}
```

### 3.3 git_command 工具

执行 git 命令，智能处理各种 diff 场景。

**Schema 定义：**

```typescript
const gitCommandTool = defineTool("git_command", {
  description: `执行 git 命令获取代码仓库信息。

常用命令场景：

1. 查看工作区状态：
   - git status --short          # 查看变更文件列表
   - git status                  # 详细状态

2. 查看 diff：
   - git diff                    # 未暂存的变更
   - git diff --cached           # 已暂存的变更
   - git diff HEAD               # 所有未提交的变更
   - git diff <branch>...HEAD    # 当前分支相对于某分支的变更
   - git diff <commit1>..<commit2>  # 两个提交之间的差异
   - git diff <commit>^..<commit>   # 某个提交引入的变更

3. 查看提交信息：
   - git log --oneline -n 20     # 最近20条提交
   - git show <commit>           # 查看某个提交的详细内容
   - git show <commit> --stat    # 查看提交的文件变更统计

4. 分支信息：
   - git branch -a               # 所有分支
   - git branch --show-current   # 当前分支名
   - git rev-parse HEAD          # 当前提交哈希
   - git merge-base <branch> HEAD  # 与某分支的共同祖先

5. 文件历史：
   - git log -p <file>           # 文件的提交历史和变更
   - git blame <file>            # 文件每行的最后修改信息

参数说明：
- args: git 命令参数数组，例如 ["status", "--short"]
- cwd: 可选，指定工作目录，默认为当前工作目录

返回：命令的标准输出，如果失败则返回错误信息。`,
  parameters: z.object({
    args: z.array(z.string()).describe("git 命令参数（不含 'git' 本身）"),
    cwd: z.string().optional().describe("工作目录，默认为当前目录"),
  }),
  execute: async (args, context) => {
    // 实现见后文
  },
});
```

**使用示例（LLM 调用）：**

```json
// 查看当前分支相对于 main 的变更
{
  "name": "git_command",
  "input": {
    "args": ["diff", "main...HEAD"]
  }
}

// 查看某个提交之后的所有变更
{
  "name": "git_command",
  "input": {
    "args": ["diff", "13bad5..HEAD"]
  }
}

// 查看某个 PR 的变更
{
  "name": "git_command",
  "input": {
    "args": ["diff", "origin/pr/12...HEAD"]
  }
}
```

### 3.4 gh_command 工具

执行 GitHub CLI (gh) 命令，获取 PR 信息。

**Schema 定义：**

```typescript
const ghCommandTool = defineTool("gh_command", {
  description: `执行 GitHub CLI (gh) 命令获取 PR 和仓库信息。

常用命令场景：

1. 查看 PR 信息：
   - gh pr view <number>         # 查看 PR 详情
   - gh pr view <number> --json title,body,author,state,files
   - gh pr list                  # 列出 PR

2. 查看 PR diff：
   - gh pr diff <number>         # 查看 PR 的代码变更
   - gh pr diff <number> --name-only  # 仅显示变更文件名

3. PR 评论和审查：
   - gh pr view <number> --comments  # 查看 PR 评论
   - gh api repos/:owner/:repo/pulls/:number/reviews

4. 仓库信息：
   - gh repo view                # 查看当前仓库信息
   - gh repo view --json name,owner

参数说明：
- args: gh 命令参数数组，例如 ["pr", "view", "12"]
- cwd: 可选，指定工作目录

返回：命令的标准输出，如果失败则返回错误信息。`,
  parameters: z.object({
    args: z.array(z.string()).describe("gh 命令参数（不含 'gh' 本身）"),
    cwd: z.string().optional().describe("工作目录，默认为当前目录"),
  }),
  execute: async (args, context) => {
    // 实现见后文
  },
});
```

**使用示例（LLM 调用）：**

```json
// 查看 PR #12 的详情
{
  "name": "gh_command",
  "input": {
    "args": ["pr", "view", "12"]
  }
}

// 获取 PR #12 的 diff
{
  "name": "gh_command",
  "input": {
    "args": ["pr", "diff", "12"]
  }
}

// 获取 PR 的结构化信息
{
  "name": "gh_command",
  "input": {
    "args": ["pr", "view", "12", "--json", "title,body,author,files,additions,deletions"]
  }
}
```

---

## 4. System Prompt 设计

System Prompt 是 CodeReview Agent 的核心，指导 LLM 如何理解用户意图并执行审查。详见 `./week06/codereview-agent/prompts/system.md`。

### 4.1 输入解析策略

Agent 需要智能解析用户的自然语言输入：

| 用户输入示例 | 解析结果 | 执行策略 |
|-------------|---------|---------|
| "帮我 review 当前分支新代码" | 分支对比 | `git diff main...HEAD` (假设 main 是主分支) |
| "review 一下" | 默认 | `git status` + `git diff HEAD` |
| "review commit 13bad5 之后的代码" | 提交范围 | `git diff 13bad5..HEAD` |
| "review pull request 12" | PR 审查 | `gh pr view 12` + `gh pr diff 12` |
| "review src/auth/login.ts" | 文件审查 | 直接读取文件内容 |
| "review 最近3个提交" | 提交序列 | `git log -3 --oneline` + 逐个 `git show` |

### 4.2 智能分支检测

当用户说"当前分支新代码"时，Agent 需要自动检测主分支：

```
1. 获取当前分支名: git branch --show-current
2. 尝试找主分支: git remote show origin (查找 HEAD branch)
3. 常见主分支名: main, master, develop
4. 执行对比: git diff <main-branch>...HEAD
```

### 4.3 上下文收集流程

```
1. git status --short      → 识别变更文件
2. git diff <range>        → 理解变更内容
3. read_file (每个变更文件) → 获取完整上下文
4. 检查 AGENTS.md/CLAUDE.md → 获取项目规范
5. 必要时 git log/git blame → 理解历史上下文
```

---

## 5. 用户交互场景

### 5.1 场景一：Review 当前分支新代码

**用户输入：**
```
帮我 review 当前分支新代码
```

**Agent 执行流程：**

```
1. [git_command] git branch --show-current
   → 获取当前分支名 (如: feature/auth)

2. [git_command] git remote show origin
   → 确定主分支 (如: main)

3. [git_command] git diff main...HEAD --stat
   → 查看变更文件统计

4. [git_command] git diff main...HEAD
   → 获取详细 diff

5. [read_file] 读取每个变更文件的完整内容
   → src/auth/login.ts
   → src/auth/middleware.ts
   → src/types/auth.ts

6. [read_file] 检查项目规范
   → AGENTS.md (如果存在)
   → CLAUDE.md (如果存在)

7. 分析并输出审查报告
```

### 5.2 场景二：Review 某个提交之后的代码

**用户输入：**
```
帮我 review commit 13bad5 之后的代码
```

**Agent 执行流程：**

```
1. [git_command] git log --oneline 13bad5..HEAD
   → 列出该提交之后的所有提交

2. [git_command] git diff 13bad5..HEAD --stat
   → 查看变更文件统计

3. [git_command] git diff 13bad5..HEAD
   → 获取详细 diff

4. [read_file] 读取变更文件的完整内容

5. 分析并输出审查报告
```

### 5.3 场景三：Review Pull Request

**用户输入：**
```
帮我 review pull request 12
```

**Agent 执行流程：**

```
1. [gh_command] gh pr view 12 --json title,body,author,baseRefName,headRefName,files
   → 获取 PR 元信息

2. [gh_command] gh pr diff 12
   → 获取 PR 的代码变更

3. [git_command] git fetch origin pull/12/head:pr-12
   → (可选) 获取 PR 分支到本地

4. [read_file] 读取变更文件的完整内容

5. [gh_command] gh pr view 12 --comments
   → 查看现有评论，避免重复

6. 分析并输出审查报告
```

---

## 6. 实现计划

### 6.1 目录结构

```
week06/codereview-agent/
├── src/
│   ├── index.ts              # 入口，导出公共 API
│   ├── agent.ts              # CodeReviewAgent 类
│   ├── tools/
│   │   ├── index.ts          # 工具导出
│   │   ├── read-file.ts      # read_file 工具
│   │   ├── write-file.ts     # write_file 工具
│   │   ├── git-command.ts    # git_command 工具
│   │   └── gh-command.ts     # gh_command 工具
│   └── utils/
│       ├── git.ts            # Git 相关工具函数
│       └── fs.ts             # 文件系统工具函数
├── prompts/
│   └── system.md             # System Prompt
├── examples/
│   ├── review-branch.ts      # 分支审查示例
│   ├── review-commit.ts      # 提交审查示例
│   └── review-pr.ts          # PR 审查示例
├── package.json
├── tsconfig.json
└── README.md
```

### 6.2 核心实现

#### 6.2.1 工具实现

**read_file 工具：**

```typescript
import { defineTool } from "../../simple-agent/src/tool.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const readFileTool = defineTool("read_file", {
  description: `读取指定文件的内容。

使用场景：
- 读取变更文件的完整内容以理解上下文
- 查看 AGENTS.md、CLAUDE.md 等项目规范文件
- 查看相关依赖文件理解代码关系

参数说明：
- path: 文件路径，相对于工作目录或绝对路径

返回：文件内容字符串，如果文件不存在则返回错误信息。`,
  parameters: z.object({
    path: z.string().describe("要读取的文件路径"),
  }),
  execute: async (args, context) => {
    try {
      const absolutePath = resolve(args.path);
      const content = await readFile(absolutePath, "utf-8");
      return {
        title: `File: ${args.path}`,
        output: content,
        metadata: { path: absolutePath },
      };
    } catch (error) {
      return {
        title: `Error reading file: ${args.path}`,
        output: "",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});
```

**git_command 工具：**

```typescript
import { defineTool } from "../../simple-agent/src/tool.js";
import { z } from "zod";
import { spawn } from "node:child_process";

export const gitCommandTool = defineTool("git_command", {
  description: `执行 git 命令获取代码仓库信息。

常用命令场景：

1. 查看工作区状态：
   - git status --short          # 查看变更文件列表

2. 查看 diff：
   - git diff                    # 未暂存的变更
   - git diff --cached           # 已暂存的变更
   - git diff <branch>...HEAD    # 当前分支相对于某分支的变更
   - git diff <commit1>..<commit2>  # 两个提交之间的差异

3. 查看提交信息：
   - git log --oneline -n 20     # 最近20条提交
   - git show <commit>           # 查看某个提交的详细内容

4. 分支信息：
   - git branch -a               # 所有分支
   - git branch --show-current   # 当前分支名

参数说明：
- args: git 命令参数数组，例如 ["status", "--short"]
- cwd: 可选，指定工作目录

返回：命令的标准输出。`,
  parameters: z.object({
    args: z.array(z.string()).describe("git 命令参数"),
    cwd: z.string().optional().describe("工作目录"),
  }),
  execute: async (args, context) => {
    return new Promise((resolve) => {
      const proc = spawn("git", args.args, {
        cwd: args.cwd || process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({
            title: `git ${args.args.join(" ")}`,
            output: stdout || "(no output)",
          });
        } else {
          resolve({
            title: `git ${args.args.join(" ")} (failed)`,
            output: stderr || `Exit code: ${code}`,
            metadata: { exitCode: code, error: stderr },
          });
        }
      });
    });
  },
});
```

**gh_command 工具：**

```typescript
import { defineTool } from "../../simple-agent/src/tool.js";
import { z } from "zod";
import { spawn } from "node:child_process";

export const ghCommandTool = defineTool("gh_command", {
  description: `执行 GitHub CLI (gh) 命令获取 PR 和仓库信息。

常用命令场景：

1. 查看 PR 信息：
   - gh pr view <number>         # 查看 PR 详情
   - gh pr view <number> --json title,body,author

2. 查看 PR diff：
   - gh pr diff <number>         # 查看 PR 的代码变更

3. PR 评论：
   - gh pr view <number> --comments

参数说明：
- args: gh 命令参数数组
- cwd: 可选，工作目录

返回：命令的标准输出。`,
  parameters: z.object({
    args: z.array(z.string()).describe("gh 命令参数"),
    cwd: z.string().optional().describe("工作目录"),
  }),
  execute: async (args, context) => {
    return new Promise((resolve) => {
      const proc = spawn("gh", args.args, {
        cwd: args.cwd || process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({
            title: `gh ${args.args.join(" ")}`,
            output: stdout || "(no output)",
          });
        } else {
          resolve({
            title: `gh ${args.args.join(" ")} (failed)`,
            output: stderr || `Exit code: ${code}`,
            metadata: { exitCode: code, error: stderr },
          });
        }
      });
    });
  },
});
```

#### 6.2.2 CodeReviewAgent 类

```typescript
import { Agent, AgentConfig, ToolRegistry, ConversationManager } from "../../simple-agent/src/index.js";
import { readFileTool } from "./tools/read-file.js";
import { writeFileTool } from "./tools/write-file.js";
import { gitCommandTool } from "./tools/git-command.js";
import { ghCommandTool } from "./tools/gh-command.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface CodeReviewAgentConfig {
  provider: AgentConfig["provider"];
  maxSteps?: number;
  temperature?: number;
  workingDirectory?: string;
  onTextDelta?: (text: string) => void;
  onToolCall?: (tool: string, input: unknown) => void;
  onToolResult?: (tool: string, result: any) => void;
}

export class CodeReviewAgent {
  private agent: Agent;
  private toolRegistry: ToolRegistry;
  private conversation: ConversationManager;
  private systemPrompt: string;

  constructor(config: CodeReviewAgentConfig) {
    // 加载 system prompt
    this.systemPrompt = this.loadSystemPrompt();

    // 创建工具注册表
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.register(readFileTool);
    this.toolRegistry.register(writeFileTool);
    this.toolRegistry.register(gitCommandTool);
    this.toolRegistry.register(ghCommandTool);

    // 创建对话管理器
    this.conversation = new ConversationManager();

    // 创建 agent
    this.agent = new Agent(
      {
        provider: config.provider,
        maxSteps: config.maxSteps || 50,
        systemPrompt: this.systemPrompt,
        temperature: config.temperature || 0.3,
        toolTimeout: 30000,
        onTextDelta: config.onTextDelta,
        onToolCall: config.onToolCall,
        onToolResult: config.onToolResult,
      },
      this.toolRegistry,
      this.conversation
    );
  }

  private loadSystemPrompt(): string {
    const promptPath = resolve(import.meta.dirname, "../prompts/system.md");
    return readFileSync(promptPath, "utf-8");
  }

  async review(input: string, abortSignal?: AbortSignal) {
    return this.agent.run(input, abortSignal);
  }

  getConversation() {
    return this.conversation;
  }

  clearConversation() {
    this.conversation.clear();
  }
}

// 工厂函数
export function createCodeReviewAgent(config: CodeReviewAgentConfig) {
  return new CodeReviewAgent(config);
}
```

---

## 7. System Prompt 工具说明更新

需要在 `./week06/codereview-agent/prompts/system.md` 中更新工具说明部分，添加详细的工具使用示例：

```markdown
## Tools Available

You have access to the following tools:

### read_file
Read the contents of any file in the repository.
```
read_file(path: string) -> { title: string, output: string }
```

**Parameters:**
- `path` (string): The file path to read, can be relative or absolute

**Examples:**
```json
{"name": "read_file", "input": {"path": "src/auth/login.ts"}}
{"name": "read_file", "input": {"path": "AGENTS.md"}}
```

**Use cases:**
- Read full file contents for context after seeing a diff
- Check for AGENTS.md, CLAUDE.md, or other convention files
- Understand related code and dependencies

### write_file
Write content to a file in the repository.
```
write_file(path: string, content: string) -> { title: string, output: string }
```

**Parameters:**
- `path` (string): The target file path
- `content` (string): The content to write

**Examples:**
```json
{"name": "write_file", "input": {"path": "review-report.md", "content": "# Review Report\n..."}}
```

**Use cases:**
- Create review reports if requested
- Write suggested fixes or patches
- Document findings in a structured format

### git_command
Execute git commands to inspect repository state.
```
git_command(args: string[], cwd?: string) -> { title: string, output: string }
```

**Parameters:**
- `args` (string[]): Git command arguments (without 'git')
- `cwd` (optional string): Working directory

**Common Commands for Review:**

| Scenario | Command | Example |
|----------|---------|---------|
| List changed files | `["status", "--short"]` | See what files changed |
| Unstaged changes | `["diff"]` | View unstaged diff |
| Staged changes | `["diff", "--cached"]` | View staged diff |
| All uncommitted | `["diff", "HEAD"]` | All local changes |
| Branch diff | `["diff", "main...HEAD"]` | Changes in current branch |
| Commit range | `["diff", "abc123..HEAD"]` | Changes since commit |
| Show commit | `["show", "<hash>"]` | View specific commit |
| Recent commits | `["log", "--oneline", "-n", "20"]` | Recent history |
| File blame | `["blame", "<file>"]` | Line-by-line history |
| Current branch | `["branch", "--show-current"]` | Get branch name |
| All branches | `["branch", "-a"]` | List all branches |

**Examples:**
```json
{"name": "git_command", "input": {"args": ["status", "--short"]}}
{"name": "git_command", "input": {"args": ["diff", "main...HEAD"]}}
{"name": "git_command", "input": {"args": ["log", "--oneline", "-n", "10"]}}
```

### gh_command
Execute GitHub CLI (gh) commands for PR information.
```
gh_command(args: string[], cwd?: string) -> { title: string, output: string }
```

**Parameters:**
- `args` (string[]): gh command arguments (without 'gh')
- `cwd` (optional string): Working directory

**Common Commands for Review:**

| Scenario | Command | Example |
|----------|---------|---------|
| View PR info | `["pr", "view", "<number>"]` | PR details |
| PR as JSON | `["pr", "view", "<number>", "--json", "title,body,files"]` | Structured data |
| PR diff | `["pr", "diff", "<number>"]` | Code changes |
| PR comments | `["pr", "view", "<number>", "--comments"]` | Existing reviews |
| List PRs | `["pr", "list"]` | Open PRs |

**Examples:**
```json
{"name": "gh_command", "input": {"args": ["pr", "view", "12"]}}
{"name": "gh_command", "input": {"args": ["pr", "diff", "12"]}}
{"name": "gh_command", "input": {"args": ["pr", "view", "12", "--json", "title,body,author"]}}
```
```

---

## 8. 测试计划

### 8.1 单元测试

- 每个工具的独立测试
- 参数验证测试
- 错误处理测试

### 8.2 集成测试

- 分支审查场景测试
- 提交审查场景测试
- PR 审查场景测试

### 8.3 端到端测试

使用真实仓库测试完整的审查流程。

---

## 9. 后续扩展

### 9.1 短期

- [ ] 支持更多 git 操作（stash、rebase 等）
- [ ] 支持 GitLab CLI (glab)
- [ ] 支持增量审查（只审查新增内容）

### 9.2 长期

- [ ] 支持自定义审查规则
- [ ] 集成静态分析工具（ESLint、Biome 等）
- [ ] 支持多语言项目的语言特定审查
- [ ] 生成修复 PR 的能力
