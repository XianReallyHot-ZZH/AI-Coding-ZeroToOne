# CodeReview Agent 设计文档

## 1. 概述

CodeReview Agent 是一个专注于代码审查的智能代理，能够分析代码变更并提供可操作的反馈。它基于 `x-simple-agent` SDK 构建，支持多轮对话和工具调用。

### 1.1 核心能力

- **多场景审查**：支持 branch diff、commit diff、PR diff 等多种审查场景
- **深度分析**：通过读取完整文件内容，理解代码上下文
- **规范检查**：自动检测并遵循项目编码规范（AGENTS.md、CLAUDE.md 等）
- **结构化输出**：按严重程度分类的问题报告

### 1.2 用户使用场景

```bash
# 审查当前分支相对于 master 的新代码
codereview "帮我 review 当前 branch 新代码"

# 审查某个 commit 之后的代码变更
codereview "帮我 review commit 13bad5 之后的代码"

# 审查特定 Pull Request
codereview "帮我 review pull request 12 的代码"

# 审查未提交的变更
codereview "帮我 review 当前未提交的代码"

# 审查特定文件
codereview "review src/auth/login.ts"
```

---

## 2. 系统架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CodeReview Agent                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   System    │    │    LLM      │    │     Tool Layer      │  │
│  │   Prompt    │───▶│   Client    │◀──▶│                     │  │
│  │             │    │             │    │  ┌───────────────┐  │  │
│  │ (system.md) │    │ (OpenAI/    │    │  │  read_file    │  │  │
│  │             │    │  DeepSeek)  │    │  ├───────────────┤  │  │
│  └─────────────┘    └─────────────┘    │  │  write_file   │  │  │
│                                        │  ├───────────────┤  │  │
│                                        │  │  git_command  │  │  │
│                                        │  ├───────────────┤  │  │
│                                        │  │  gh_command   │  │  │
│                                        │  └───────────────┘  │  │
│                                        └─────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         Code Repository        │
              │                               │
              │   - Git History               │
              │   - File Contents             │
              │   - Pull Requests             │
              └───────────────────────────────┘
```

### 2.2 核心组件

| 组件 | 职责 | 实现方式 |
|------|------|----------|
| Agent | 主控制器，管理对话循环和工具调用 | 基于 `x-simple-agent` 的 `Agent` 类 |
| System Prompt | 定义 Agent 的行为和输出格式 | `system.md` 文件 |
| Tool Layer | 提供文件操作和 Git/GitHub 命令 | 自定义 Tool 实现 |
| LLM Client | 与大语言模型交互 | OpenAI/DeepSeek 兼容 API |

---

## 3. 工具定义

### 3.1 read_file 工具

读取文件内容，用于获取代码上下文。

```typescript
{
  name: "read_file",
  description: `读取指定文件的内容。用于获取完整代码上下文。

使用场景：
- 读取变更文件的完整内容，理解 diff 周围的代码
- 检查项目规范文件（AGENTS.md、CLAUDE.md、.editorconfig 等）
- 查看相关依赖文件或配置文件

注意事项：
- 优先使用绝对路径
- 对于大型文件，注意输出长度限制`,
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "要读取的文件绝对路径"
      },
      encoding: {
        type: "string",
        description: "文件编码（默认 utf-8）",
        enum: ["utf-8", "base64", "hex"]
      }
    },
    required: ["path"]
  }
}
```

**示例调用**：

```json
{
  "name": "read_file",
  "arguments": {
    "path": "/home/user/project/src/auth/login.ts"
  }
}
```

**返回格式**：

```json
{
  "output": "// 文件内容...",
  "metadata": {
    "path": "/home/user/project/src/auth/login.ts",
    "size": 2048,
    "modified": "2024-03-15T10:30:00Z"
  }
}
```

### 3.2 write_file 工具

写入文件内容，用于生成审查报告或修复建议。

```typescript
{
  name: "write_file",
  description: `将内容写入指定文件。用于：
- 生成代码审查报告
- 输出修复建议或补丁
- 创建结构化的审查文档

安全提示：
- 会覆盖已存在的文件
- 自动创建不存在的父目录`,
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "要写入的文件绝对路径"
      },
      content: {
        type: "string",
        description: "要写入的文件内容"
      },
      encoding: {
        type: "string",
        description: "文件编码（默认 utf-8）",
        enum: ["utf-8", "base64", "hex"]
      }
    },
    required: ["path", "content"]
  }
}
```

**示例调用**：

```json
{
  "name": "write_file",
  "arguments": {
    "path": "/home/user/project/.codereview/report.md",
    "content": "# Code Review Report\n\n## Critical Issues\n..."
  }
}
```

### 3.3 git_command 工具

执行 Git 命令，用于获取代码变更信息。

```typescript
{
  name: "git_command",
  description: `执行 Git 命令，获取代码仓库状态和变更信息。

常用命令模式：

1. **获取变更文件列表**
   - git status --short
   - git diff --name-only

2. **获取未暂存的变更**
   - git diff

3. **获取已暂存的变更**
   - git diff --cached

4. **获取分支间差异**
   - git diff master...HEAD      # 当前分支相对于 master 的变更
   - git diff origin/main...HEAD # 当前分支相对于远程 main 的变更

5. **获取特定 commit 的变更**
   - git show <commit>           # 查看某个 commit 的详情
   - git show <commit> --stat    # 查看文件变更统计

6. **获取 commit 范围的变更**
   - git diff <commit1>..<commit2>

7. **获取 commit 历史**
   - git log --oneline -n 20
   - git log -p <file>           # 查看某个文件的变更历史

8. **代码追溯**
   - git blame <file>            # 查看每行代码的作者和时间
   - git log -p <file>           # 查看文件的完整变更历史

9. **分支信息**
   - git branch -a               # 列出所有分支
   - git rev-parse HEAD          # 获取当前 commit hash
   - git merge-base master HEAD  # 获取与 master 的分叉点

注意事项：
- 使用 --no-color 避免颜色代码干扰
- 大型 diff 可能需要分页或限制输出`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "要执行的 Git 命令（不含 'git' 前缀）"
      },
      timeout: {
        type: "number",
        description: "超时时间（毫秒，默认 30000）"
      }
    },
    required: ["command"]
  }
}
```

**示例调用**：

```json
// 获取当前分支相对于 master 的变更
{
  "name": "git_command",
  "arguments": {
    "command": "diff master...HEAD --no-color"
  }
}

// 获取某个 commit 之后的变更
{
  "name": "git_command",
  "arguments": {
    "command": "diff 13bad5..HEAD --no-color"
  }
}

// 查看 PR 对应的变更
{
  "name": "git_command",
  "arguments": {
    "command": "diff origin/master...HEAD --no-color"
  }
}
```

### 3.4 gh_command 工具

执行 GitHub CLI 命令，用于获取 Pull Request 信息。

```typescript
{
  name: "gh_command",
  description: `执行 GitHub CLI (gh) 命令，与 GitHub 交互。

常用命令模式：

1. **查看 Pull Request**
   - gh pr view <number>         # 查看 PR 详情
   - gh pr view <number> --json title,body,author,state

2. **获取 PR Diff**
   - gh pr diff <number>         # 获取 PR 的代码差异

3. **获取 PR 列表**
   - gh pr list                  # 列出当前仓库的 PR
   - gh pr list --author @me     # 列出我创建的 PR
   - gh pr list --state open     # 列出打开的 PR

4. **获取 PR 评论**
   - gh api repos/{owner}/{repo}/pulls/{number}/comments

5. **获取 PR 检查状态**
   - gh pr checks <number>

6. **获取仓库信息**
   - gh repo view                # 查看当前仓库信息
   - gh repo view --json name,owner

前置条件：
- 需要先运行 'gh auth login' 进行认证
- 需要在 Git 仓库目录下执行`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "要执行的 gh 命令（不含 'gh' 前缀）"
      },
      timeout: {
        type: "number",
        description: "超时时间（毫秒，默认 30000）"
      }
    },
    required: ["command"]
  }
}
```

**示例调用**：

```json
// 查看 PR #12 的详情
{
  "name": "gh_command",
  "arguments": {
    "command": "pr view 12"
  }
}

// 获取 PR #12 的代码差异
{
  "name": "gh_command",
  "arguments": {
    "command": "pr diff 12"
  }
}

// 以 JSON 格式获取 PR 信息
{
  "name": "gh_command",
  "arguments": {
    "command": "pr view 12 --json title,body,author,headRefName,baseRefName"
  }
}
```

---

## 4. 审查场景处理

### 4.1 场景一：审查当前分支新代码

**用户输入**：`"帮我 review 当前 branch 新代码"`

**处理流程**：

```
1. 获取当前分支名称
   git rev-parse --abbrev-ref HEAD

2. 获取与主分支的分叉点
   git merge-base master HEAD  (或 main)

3. 获取变更文件列表
   git diff --name-only <merge-base>...HEAD

4. 获取完整 diff
   git diff <merge-base>...HEAD --no-color

5. 对每个变更文件：
   - 读取完整文件内容
   - 检查相关的规范文件

6. 分析并输出审查结果
```

**工具调用序列示例**：

```json
[
  { "name": "git_command", "arguments": { "command": "rev-parse --abbrev-ref HEAD" } },
  { "name": "git_command", "arguments": { "command": "merge-base master HEAD" } },
  { "name": "git_command", "arguments": { "command": "diff --name-status <base>...HEAD" } },
  { "name": "git_command", "arguments": { "command": "diff <base>...HEAD --no-color" } },
  { "name": "read_file", "arguments": { "path": "/project/src/changed-file.ts" } },
  { "name": "read_file", "arguments": { "path": "/project/AGENTS.md" } }
]
```

### 4.2 场景二：审查某 Commit 之后的代码

**用户输入**：`"帮我 review commit 13bad5 之后的代码"`

**处理流程**：

```
1. 验证 commit hash
   git rev-parse 13bad5

2. 获取变更文件列表
   git diff --name-only 13bad5..HEAD

3. 获取完整 diff
   git diff 13bad5..HEAD --no-color

4. 获取 commit 历史（了解变更背景）
   git log --oneline 13bad5..HEAD

5. 对每个变更文件读取完整内容

6. 分析并输出审查结果
```

### 4.3 场景三：审查 Pull Request

**用户输入**：`"帮我 review pull request 12 的代码"`

**处理流程**：

```
1. 获取 PR 详情
   gh pr view 12 --json title,body,author,headRefName,baseRefName

2. 获取 PR diff
   gh pr diff 12

3. 切换到 PR 分支（可选，用于读取完整文件）
   gh pr checkout 12

4. 对每个变更文件读取完整内容

5. 分析并输出审查结果

6. 切回原分支（如果之前切换了）
```

### 4.4 场景四：审查未提交的变更

**用户输入**：`"帮我 review 当前未提交的代码"`

**处理流程**：

```
1. 获取变更状态
   git status --short

2. 获取未暂存的变更
   git diff --no-color

3. 获取已暂存的变更
   git diff --cached --no-color

4. 读取所有变更文件的完整内容

5. 分析并输出审查结果
```

---

## 5. System Prompt 增强

基于现有的 `system.md`，需要增强以下部分：

### 5.1 工具使用指南

```markdown
## Tools Available

You have access to the following tools:

### read_file
Read the contents of any file in the repository.
```
read_file(path: string, encoding?: string) -> { output: string, metadata: object }
```
- Use to read full file contents for context
- Use to check for AGENTS.md, CLAUDE.md, or other convention files
- Use to understand related code and dependencies

**Examples:**
```json
// Read a TypeScript file
{ "name": "read_file", "arguments": { "path": "/home/user/project/src/auth/login.ts" } }

// Read project conventions
{ "name": "read_file", "arguments": { "path": "/home/user/project/AGENTS.md" } }
```

### write_file
Write content to a file in the repository.
```
write_file(path: string, content: string, encoding?: string) -> { output: string, metadata: object }
```
- Use to create review reports if requested
- Use to write suggested fixes or patches
- Use to document findings in a structured format

**Examples:**
```json
// Write a review report
{
  "name": "write_file",
  "arguments": {
    "path": "/home/user/project/.codereview/report.md",
    "content": "# Code Review Report\n\n## Critical Issues\n..."
  }
}
```

### git_command
Execute git commands to inspect repository state.
```
git_command(command: string, timeout?: number) -> { output: string, error?: string }
```

**Common git commands for review:**

| Purpose | Command |
|---------|---------|
| List changed files | `git status --short` |
| Show unstaged changes | `git diff --no-color` |
| Show staged changes | `git diff --cached --no-color` |
| Compare branches | `git diff master...HEAD --no-color` |
| Show a commit | `git show <hash> --no-color` |
| Commit history | `git log --oneline -n 20` |
| Blame a file | `git blame <file>` |
| File history | `git log -p <file>` |
| All branches | `git branch -a` |
| Current commit | `git rev-parse HEAD` |
| Merge base | `git merge-base master HEAD` |

**Examples:**
```json
// Get diff between current branch and master
{ "name": "git_command", "arguments": { "command": "diff master...HEAD --no-color" } }

// Get changes since a specific commit
{ "name": "git_command", "arguments": { "command": "diff 13bad5..HEAD --no-color" } }

// Get list of changed files
{ "name": "git_command", "arguments": { "command": "diff --name-status master...HEAD" } }
```

### gh_command
Execute GitHub CLI commands to interact with Pull Requests.
```
gh_command(command: string, timeout?: number) -> { output: string, error?: string }
```

**Common gh commands for review:**

| Purpose | Command |
|---------|---------|
| View PR details | `gh pr view <number>` |
| Get PR diff | `gh pr diff <number>` |
| List PRs | `gh pr list --state open` |
| PR in JSON | `gh pr view <number> --json title,body,author` |
| PR checks | `gh pr checks <number>` |

**Examples:**
```json
// View PR #12
{ "name": "gh_command", "arguments": { "command": "pr view 12" } }

// Get diff of PR #12
{ "name": "gh_command", "arguments": { "command": "pr diff 12" } }

// Get PR info as JSON
{
  "name": "gh_command",
  "arguments": {
    "command": "pr view 12 --json title,body,author,headRefName,baseRefName"
  }
}
```
```

### 5.2 场景识别指南

```markdown
## Input Parsing

When the user asks for a code review, first determine the review type:

### 1. Branch Review
**Triggers:** "review current branch", "review new code", "review my changes"

**Workflow:**
1. `git rev-parse --abbrev-ref HEAD` - Get current branch name
2. `git merge-base master HEAD` or `git merge-base main HEAD` - Find merge base
3. `git diff --name-status <base>...HEAD` - List changed files
4. `git diff <base>...HEAD --no-color` - Get full diff
5. Read full files for context
6. Check for AGENTS.md in changed directories

### 2. Commit Review
**Triggers:** "review commit <hash>", "review since <hash>", "review after <hash>"

**Workflow:**
1. `git rev-parse <hash>` - Validate commit exists
2. `git diff --name-status <hash>..HEAD` - List changed files
3. `git diff <hash>..HEAD --no-color` - Get full diff
4. `git log --oneline <hash>..HEAD` - Get commit history
5. Read full files for context

### 3. Pull Request Review
**Triggers:** "review PR #<number>", "review pull request <number>"

**Workflow:**
1. `gh pr view <number> --json title,body,author,headRefName,baseRefName` - Get PR info
2. `gh pr diff <number>` - Get PR diff
3. Optionally checkout PR branch to read full files
4. Read full files for context

### 4. Uncommitted Changes Review
**Triggers:** "review uncommitted", "review staged", "review current changes"

**Workflow:**
1. `git status --short` - List all changes
2. `git diff --no-color` - Get unstaged changes
3. `git diff --cached --no-color` - Get staged changes
4. Read full files for context

### 5. File Review
**Triggers:** "review <file-path>", "check <file-path>"

**Workflow:**
1. Read the full file content
2. Check for related AGENTS.md
3. Review the file for issues
```

---

## 6. 实现计划

### 6.1 目录结构

```
week06/x-codereview-agent/
├── src/
│   ├── index.ts              # 入口文件
│   ├── agent/
│   │   ├── index.ts          # Agent 导出
│   │   └── codereview.ts     # CodeReview Agent 实现
│   ├── tools/
│   │   ├── index.ts          # 工具导出
│   │   ├── read.ts           # read_file 工具
│   │   ├── write.ts          # write_file 工具
│   │   ├── git.ts            # git_command 工具
│   │   └── gh.ts             # gh_command 工具
│   └── utils/
│       └── index.ts          # 工具函数
├── prompts/
│   └── system.md             # 系统提示词
├── package.json
├── tsconfig.json
└── README.md
```

### 6.2 核心代码实现

#### 6.2.1 入口文件 (src/index.ts)

```typescript
import { createAgent } from "../x-simple-agent/src/index.js"
import { readTool, writeTool, gitTool, ghTool } from "./tools/index.js"
import systemPrompt from "./prompts/system.md" with { type: "text" }

export interface CodeReviewAgentOptions {
  model?: string
  provider?: "openai" | "deepseek"
  apiKey?: string
  baseURL?: string
}

export function createCodeReviewAgent(options: CodeReviewAgentOptions = {}) {
  const agent = createAgent({
    model: options.model ?? "gpt-4o",
    provider: options.provider,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    systemPrompt,
    tools: [readTool, writeTool, gitTool, ghTool],
    maxSteps: 100,
  })

  return agent
}

export { readTool, writeTool, gitTool, ghTool }
export { Agent } from "../x-simple-agent/src/index.js"
```

#### 6.2.2 git_command 工具

```typescript
import type { Tool } from "../../types/index.js"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const gitTool: Tool = {
  name: "git_command",
  description: `Execute git commands to inspect repository state and changes.`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The git command to execute (without 'git' prefix)"
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)"
      }
    },
    required: ["command"]
  },
  execute: async (args: unknown) => {
    const { command, timeout = 30000 } = args as { command: string; timeout?: number }

    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      })

      let output = ""
      if (stdout) output += stdout
      if (stderr) output += `\n[stderr]: ${stderr}`

      return { output: output.trim() || "Command executed successfully" }
    } catch (error: unknown) {
      const err = error as Error & { stdout?: string; stderr?: string; killed?: boolean }
      let errorMessage = err.message

      if (err.killed) {
        errorMessage = `Command timed out after ${timeout}ms`
      }

      if (err.stdout || err.stderr) {
        errorMessage += `\n[stdout]: ${err.stdout || ""}\n[stderr]: ${err.stderr || ""}`
      }

      return { output: "", error: errorMessage }
    }
  }
}
```

#### 6.2.3 gh_command 工具

```typescript
import type { Tool } from "../../types/index.js"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const ghTool: Tool = {
  name: "gh_command",
  description: `Execute GitHub CLI commands to interact with Pull Requests.`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The gh command to execute (without 'gh' prefix)"
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)"
      }
    },
    required: ["command"]
  },
  execute: async (args: unknown) => {
    const { command, timeout = 30000 } = args as { command: string; timeout?: number }

    try {
      const { stdout, stderr } = await execAsync(`gh ${command}`, {
        timeout,
        maxBuffer: 1024 * 1024 * 10,
      })

      let output = ""
      if (stdout) output += stdout
      if (stderr) output += `\n[stderr]: ${stderr}`

      return { output: output.trim() || "Command executed successfully" }
    } catch (error: unknown) {
      const err = error as Error & { stdout?: string; stderr?: string; killed?: boolean }
      let errorMessage = err.message

      if (err.killed) {
        errorMessage = `Command timed out after ${timeout}ms`
      }

      // Check if gh is not installed
      if (err.message.includes("'gh' not found") || err.message.includes("command not found")) {
        errorMessage = "GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com/"
      }

      // Check if not authenticated
      if (err.stderr?.includes("not logged into any GitHub hosts")) {
        errorMessage = "Not authenticated with GitHub CLI. Run 'gh auth login' first."
      }

      if (err.stdout || err.stderr) {
        errorMessage += `\n[stdout]: ${err.stdout || ""}\n[stderr]: ${err.stderr || ""}`
      }

      return { output: "", error: errorMessage }
    }
  }
}
```

### 6.3 CLI 入口

```typescript
#!/usr/bin/env node
import { createCodeReviewAgent } from "./index.js"

async function main() {
  const userInput = process.argv.slice(2).join(" ") || "review current changes"

  const agent = createCodeReviewAgent({
    model: process.env.MODEL || "gpt-4o",
    provider: process.env.PROVIDER as "openai" | "deepseek" || "openai",
    apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY,
  })

  console.log(`\n🔍 Code Review: ${userInput}\n`)

  try {
    for await (const event of agent.stream(userInput)) {
      switch (event.type) {
        case "text":
          process.stdout.write(event.text)
          break
        case "tool_call":
          console.log(`\n🔧 Calling: ${event.name}`)
          break
        case "tool_result":
          if (event.isError) {
            console.log(`❌ Error: ${event.result.slice(0, 100)}...`)
          } else {
            console.log(`✅ Done`)
          }
          break
        case "error":
          console.error(`\n❌ Error: ${event.error.message}`)
          break
      }
    }
  } catch (error) {
    console.error("Failed:", error)
    process.exit(1)
  }
}

main()
```

---

## 7. 测试用例

### 7.1 单元测试

```typescript
import { describe, it, expect } from "vitest"
import { gitTool, ghTool, readTool, writeTool } from "./tools/index.js"

describe("git_tool", () => {
  it("should execute git status", async () => {
    const result = await gitTool.execute({ command: "status --short" })
    expect(result.output).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it("should handle invalid commands", async () => {
    const result = await gitTool.execute({ command: "invalid-command" })
    expect(result.error).toBeDefined()
  })
})

describe("gh_tool", () => {
  it("should handle missing gh CLI", async () => {
    // Mock scenario where gh is not installed
    const result = await ghTool.execute({ command: "pr list" })
    // Result depends on whether gh is installed
    expect(result.output !== "" || result.error !== "").toBe(true)
  })
})
```

### 7.2 集成测试

```typescript
import { describe, it, expect } from "vitest"
import { createCodeReviewAgent } from "./index.js"

describe("CodeReview Agent Integration", () => {
  it("should review uncommitted changes", async () => {
    const agent = createCodeReviewAgent()

    const messages = await agent.run("review current uncommitted changes")

    expect(messages.length).toBeGreaterThan(0)
    expect(agent.getLastResponse()).toBeDefined()
  })

  it("should handle branch review request", async () => {
    const agent = createCodeReviewAgent()

    const messages = await agent.run("review current branch changes vs master")

    expect(messages.length).toBeGreaterThan(0)
  })
})
```

---

## 8. 配置与部署

### 8.1 环境变量

```bash
# LLM Provider
PROVIDER=openai          # or deepseek
MODEL=gpt-4o             # or deepseek-chat

# API Keys
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# Optional: Custom API endpoints
OPENAI_BASE_URL=https://api.openai.com/v1
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### 8.2 package.json

```json
{
  "name": "x-codereview-agent",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "codereview": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup src/index.ts src/cli.ts --format esm --dts",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "lint": "biome check src/"
  },
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.0.0"
  }
}
```

---

## 9. 未来扩展

### 9.1 短期目标

- [ ] 支持 GitLab MR 审查（使用 `glab` CLI）
- [ ] 支持增量审查（只审查新评论涉及的代码）
- [ ] 支持自定义审查规则配置

### 9.2 长期目标

- [ ] 支持多语言项目的差异化规则
- [ ] 集成静态分析工具（ESLint、TypeScript、Pylint 等）
- [ ] 支持审查结果自动发布到 PR 评论
- [ ] 支持学习项目特定的代码风格

---

## 10. 总结

本设计文档描述了一个基于 `x-simple-agent` SDK 的 CodeReview Agent，具备以下特点：

1. **完整的工具集**：read_file、write_file、git_command、gh_command
2. **多场景支持**：branch diff、commit diff、PR diff、uncommitted changes
3. **深度分析**：通过读取完整文件理解上下文
4. **规范遵循**：自动检测并遵循项目编码规范
5. **结构化输出**：按严重程度分类的问题报告

通过清晰的系统提示词和工具定义，Agent 能够准确理解用户意图并执行相应的审查任务。
