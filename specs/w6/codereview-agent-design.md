# CodeReview Agent 设计文档

## 1. 概述

CodeReview Agent 是一个专门用于代码审查的 AI Agent，能够根据用户的各种需求（分支差异、提交差异、PR 差异等）自动获取代码变更并进行深度分析，提供可操作的改进建议。

### 1.1 核心能力

- **多种审查模式**：支持分支对比、提交对比、PR 审查、文件审查等多种场景
- **上下文感知**：不仅查看 diff，还会读取完整文件内容以理解上下文
- **智能工具调用**：自动选择合适的 git/gh 命令获取代码差异
- **规范化输出**：按严重程度分类输出审查结果

### 1.2 技术架构

基于 `simple-agent` 框架构建：

```
┌─────────────────────────────────────────────────────────────┐
│                     CodeReview Agent                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ System Prompt│  │ Tool Registry│  │Conversation Mgr  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        Tools                                │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────┐  │
│  │read_file│ │write_file│ │git_command│ │  gh_command   │  │
│  └─────────┘ └──────────┘ └───────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     LLM Provider                            │
│                  (OpenAI / Anthropic)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 工具定义

### 2.1 read_file 工具

读取当前工作目录下指定文件的内容。

```typescript
const readFileTool = defineTool("read_file", {
  description: `读取文件内容。用于获取完整文件内容以理解代码上下文。

使用场景：
- 读取变更文件的完整内容（diff 只显示部分变更）
- 检查项目规范文件（AGENTS.md, CLAUDE.md, .editorconfig）
- 理解相关依赖文件

注意事项：
- 路径相对于当前工作目录
- 二进制文件会返回错误
- 支持文本文件、代码文件、配置文件等`,

  parameters: z.object({
    path: z.string().describe("文件路径，相对于当前工作目录，如 'src/index.ts'"),
  }),

  execute: async (args, context) => {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      const fullPath = path.resolve(process.cwd(), args.path);
      const content = await fs.readFile(fullPath, "utf-8");

      return {
        title: args.path,
        output: content,
        metadata: {
          path: args.path,
          size: content.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to read file '${args.path}': ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
```

**调用示例：**
```json
{
  "name": "read_file",
  "arguments": {
    "path": "src/auth/login.ts"
  }
}
```

**返回示例：**
```json
{
  "title": "src/auth/login.ts",
  "output": "// 文件内容...",
  "metadata": {
    "path": "src/auth/login.ts",
    "size": 1234
  }
}
```

---

### 2.2 write_file 工具

写入内容到当前工作目录下的指定文件。

```typescript
const writeFileTool = defineTool("write_file", {
  description: `写入内容到文件。用于创建审查报告或修复建议。

使用场景：
- 生成审查报告文件
- 创建修复补丁文件
- 记录审查结果

注意事项：
- 会覆盖已存在的文件
- 路径必须相对于当前工作目录
- 需要确保父目录存在`,

  parameters: z.object({
    path: z.string().describe("文件路径，相对于当前工作目录"),
    content: z.string().describe("要写入的文件内容"),
  }),

  execute: async (args, context) => {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      const fullPath = path.resolve(process.cwd(), args.path);
      const dir = path.dirname(fullPath);

      // 确保目录存在
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, args.content, "utf-8");

      return {
        title: args.path,
        output: `Successfully wrote ${args.content.length} bytes to ${args.path}`,
        metadata: {
          path: args.path,
          size: args.content.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to write file '${args.path}': ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
```

**调用示例：**
```json
{
  "name": "write_file",
  "arguments": {
    "path": "review-report.md",
    "content": "# 代码审查报告\n\n## 发现的问题\n..."
  }
}
```

---

### 2.3 git_command 工具

执行 git 命令，获取代码差异和仓库状态。

```typescript
const gitCommandTool = defineTool("git", {
  description: `执行 git 命令。用于获取代码变更、差异、历史等信息。

## 常用命令速查

### 获取变更状态
- \`git status --short\` - 查看简短状态（变更文件列表）
- \`git status\` - 查看完整状态

### 获取差异
- \`git diff\` - 未暂存的变更
- \`git diff --cached\` 或 \`git diff --staged\` - 已暂存但未提交的变更
- \`git diff HEAD\` - 所有未提交的变更（暂存+未暂存）
- \`git diff <commit>\` - 与指定提交的差异
- \`git diff <commit1>..<commit2>\` - 两个提交之间的差异
- \`git diff <branch1>...<branch2>\` - 两个分支之间的差异（三点表示法只显示分支分叉后的变更）
- \`git diff <branch1>..<branch2>\` - 两个分支之间的差异（两点表示法显示所有差异）

### 获取提交信息
- \`git log --oneline -n 20\` - 最近20条提交（简洁格式）
- \`git log -1 --format="%H %s"\` - 最新提交的hash和消息
- \`git show <commit>\` - 查看指定提交的详细变更
- \`git show <commit> --stat\` - 查看提交的文件变更统计

### 分支操作
- \`git branch -a\` - 列出所有分支
- \`git branch --show-current\` - 显示当前分支名
- \`git rev-parse HEAD\` - 获取当前提交的完整hash

### 其他有用命令
- \`git blame <file>\` - 查看文件每行的修改历史
- \`git log -p <file>\` - 查看文件的变更历史

## 命令选择指南

| 用户需求 | 推荐命令 |
|---------|---------|
| 审查当前分支新代码 | \`git diff main...HEAD\` |
| 审查未提交的变更 | \`git diff HEAD\` |
| 审查某个提交 | \`git show <commit>\` |
| 审查某个提交之后的所有变更 | \`git diff <commit>..HEAD\` |
| 审查两个提交之间的变更 | \`git diff <commit1>..<commit2>\` |
| 审查PR变更 | \`git diff main...HEAD\` (假设main是目标分支)`,

  parameters: z.object({
    command: z.string().describe("git 命令（不包含 'git' 前缀），如 'diff main...HEAD'"),
  }),

  execute: async (args, context) => {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(`git ${args.command}`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
        cwd: process.cwd(),
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      return {
        title: `git ${args.command}`,
        output: stdout || "(no output)",
        metadata: {
          command: args.command,
          exitCode: 0,
        },
      };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      // git 有时会在 stderr 输出内容但返回码为0
      if (execError.stdout) {
        return {
          title: `git ${args.command}`,
          output: execError.stdout,
          metadata: {
            command: args.command,
            warning: execError.stderr,
          },
        };
      }
      throw new Error(`git ${args.command} failed: ${execError.stderr || execError.message}`);
    }
  },
});
```

**调用示例：**
```json
{
  "name": "git",
  "arguments": {
    "command": "diff main...HEAD"
  }
}
```

**返回示例：**
```json
{
  "title": "git diff main...HEAD",
  "output": "diff --git a/src/index.ts b/src/index.ts\n...",
  "metadata": {
    "command": "diff main...HEAD",
    "exitCode": 0
  }
}
```

---

### 2.4 gh_command 工具

执行 GitHub CLI (gh) 命令，获取 PR 信息和 GitHub 相关数据。

```typescript
const ghCommandTool = defineTool("gh", {
  description: `执行 GitHub CLI (gh) 命令。用于获取 Pull Request 信息、查看 PR 差异等。

## 前提条件
- 需要安装 GitHub CLI: https://cli.github.com/
- 需要先登录: \`gh auth login\`
- 当前目录必须是 GitHub 仓库

## 常用命令速查

### PR 相关
- \`gh pr list\` - 列出 PR
- \`gh pr list --state open\` - 列出打开的 PR
- \`gh pr view <number>\` - 查看 PR 详情
- \`gh pr view <number> --json title,body,author,headRefName,baseRefName\` - 获取 PR 元数据
- \`gh pr diff <number>\` - 查看 PR 的代码差异
- \`gh pr diff <number> --patch\` - 以 patch 格式查看差异

### Issue 相关
- \`gh issue view <number>\` - 查看 Issue 详情

### 仓库相关
- \`gh repo view\` - 查看当前仓库信息
- \`gh repo view --json name,owner\` - 获取仓库名和所有者

## 审查 PR 的工作流程

1. 先用 \`gh pr view <number> --json title,body,author,headRefName,baseRefName\` 获取 PR 信息
2. 再用 \`gh pr diff <number>\` 获取代码差异
3. 分析差异并用 read_file 读取相关完整文件
4. 输出审查结果`,

  parameters: z.object({
    command: z.string().describe("gh 命令（不包含 'gh' 前缀），如 'pr view 123'"),
  }),

  execute: async (args, context) => {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(`gh ${args.command}`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        cwd: process.cwd(),
      });

      return {
        title: `gh ${args.command}`,
        output: stdout || "(no output)",
        metadata: {
          command: args.command,
          exitCode: 0,
        },
      };
    } catch (error) {
      const execError = error as { stderr?: string; message?: string };
      throw new Error(`gh ${args.command} failed: ${execError.stderr || execError.message}`);
    }
  },
});
```

**调用示例：**
```json
{
  "name": "gh",
  "arguments": {
    "command": "pr diff 12"
  }
}
```

---

## 3. System Prompt 设计

System Prompt 是 CodeReview Agent 的核心，需要指导 LLM 如何：

1. 解析用户输入，确定审查类型
2. 选择正确的工具和命令
3. 执行审查流程
4. 输出规范化结果

详见 `./week06/codereview-agent/prompts/system.md`，核心要点：

### 3.1 输入解析

Agent 需要理解用户的自然语言请求，并转换为具体的审查操作：

| 用户请求示例 | 审查类型 | 推荐操作 |
|------------|---------|---------|
| "帮我 review 当前分支新代码" | 分支对比 | `git diff main...HEAD` |
| "review commit 13bad5 之后的代码" | 提交范围 | `git diff 13bad5..HEAD` |
| "review pull request 12" | PR 审查 | `gh pr diff 12` |
| "review 最后一个 commit" | 单次提交 | `git show HEAD` |
| "review staged changes" | 暂存变更 | `git diff --cached` |
| "review 所有未提交的变更" | 工作区变更 | `git diff HEAD` |

### 3.2 审查工作流

```
1. 解析用户请求 → 确定审查类型
       ↓
2. 执行 git/gh 命令 → 获取代码差异
       ↓
3. 识别变更文件列表
       ↓
4. 读取完整文件内容（不只是 diff）
       ↓
5. 检查项目规范文件（AGENTS.md 等）
       ↓
6. 深度分析代码
       ↓
7. 输出结构化审查报告
```

---

## 4. 用户交互设计

### 4.1 CLI 入口

```typescript
// codereview-agent/src/cli.ts
import { Command } from "commander";

const program = new Command();

program
  .name("codereview")
  .description("AI-powered code review agent")
  .version("1.0.0")
  .argument("[target]", "审查目标（分支名、提交hash、PR号等）")
  .option("-b, --base <branch>", "基准分支，默认为主分支")
  .option("-o, --output <file>", "输出报告到文件")
  .option("--json", "以 JSON 格式输出")
  .action(async (target, options) => {
    // 运行 agent
  });

program.parse();
```

### 4.2 使用示例

```bash
# 审查当前分支相对于 main 的新代码
codereview

# 审查当前分支相对于 develop 的新代码
codereview --base develop

# 审查特定提交之后的所有变更
codereview "13bad5..HEAD"

# 审查特定 PR
codereview "pr:12"

# 审查特定文件
codereview "src/auth/*.ts"

# 输出报告到文件
codereview -o review-report.md
```

### 4.3 自然语言交互

用户可以直接用自然语言描述需求：

```
用户: 帮我 review 当前分支新代码
Agent: 我将审查当前分支相对于 main 分支的变更...
       [执行 git diff main...HEAD]
       [读取相关文件]
       [输出审查结果]

用户: 帮我 review commit 13bad5 之后的代码
Agent: 我将审查从提交 13bad5 之后的所有变更...
       [执行 git diff 13bad5..HEAD]
       ...

用户: 帮我 review pull request 12 的代码
Agent: 我将获取 PR #12 的信息并进行审查...
       [执行 gh pr view 12 --json ...]
       [执行 gh pr diff 12]
       ...
```

---

## 5. 实现细节

### 5.1 项目结构

```
week06/codereview-agent/
├── src/
│   ├── index.ts              # 导出入口
│   ├── cli.ts                # CLI 入口
│   ├── agent.ts              # Agent 实例创建
│   ├── tools/
│   │   ├── index.ts          # 工具导出
│   │   ├── read-file.ts      # read_file 工具
│   │   ├── write-file.ts     # write_file 工具
│   │   ├── git.ts            # git 工具
│   │   └── gh.ts             # gh 工具
│   └── utils/
│       └── diff-parser.ts    # diff 解析工具
├── prompts/
│   └── system.md             # System Prompt
├── package.json
├── tsconfig.json
└── README.md
```

### 5.2 Agent 创建

```typescript
// src/agent.ts
import { Agent } from "../simple-agent/src/agent.js";
import { OpenAIProvider } from "../simple-agent/src/providers/openai.js";
import { ToolRegistry } from "../simple-agent/src/tool.js";
import { readFileTool } from "./tools/read-file.js";
import { writeFileTool } from "./tools/write-file.js";
import { gitCommandTool } from "./tools/git.js";
import { ghCommandTool } from "./tools/gh.js";
import { readFileSync } from "fs";

export function createCodeReviewAgent(config: {
  apiKey?: string;
  model?: string;
}) {
  // 加载 system prompt
  const systemPrompt = readFileSync(
    new URL("../prompts/system.md", import.meta.url),
    "utf-8"
  );

  // 创建 provider
  const provider = new OpenAIProvider({
    apiKey: config.apiKey,
    model: config.model || "gpt-4o",
  });

  // 注册工具
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(readFileTool);
  toolRegistry.register(writeFileTool);
  toolRegistry.register(gitCommandTool);
  toolRegistry.register(ghCommandTool);

  // 创建 agent
  return new Agent(
    {
      provider,
      maxSteps: 50, // 代码审查可能需要多轮工具调用
      systemPrompt,
      temperature: 0.3, // 较低温度保证稳定输出
      toolTimeout: 60000, // git 命令可能较慢
      onTextDelta: (text) => process.stdout.write(text),
      onToolCall: (tool, input) => {
        console.log(`\n[调用工具: ${tool}]`);
        console.log(`  参数: ${JSON.stringify(input)}`);
      },
      onToolResult: (tool, result) => {
        console.log(`  结果: ${result.output.slice(0, 100)}...`);
      },
    },
    toolRegistry
  );
}
```

### 5.3 主分支检测

```typescript
// src/utils/detect-main-branch.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function detectMainBranch(): Promise<string> {
  const candidates = ["main", "master", "develop", "staging"];

  for (const branch of candidates) {
    try {
      await execAsync(`git rev-parse --verify ${branch}`);
      return branch;
    } catch {
      continue;
    }
  }

  // 默认返回 main
  return "main";
}
```

---

## 6. System Prompt 更新建议

需要更新 `./week06/codereview-agent/prompts/system.md`，在 "Tools Available" 部分添加更详细的使用指南：

### 6.1 工具选择决策树

```markdown
## 工具选择指南

### 确定审查类型

1. **用户提到 "PR" 或 "pull request"**
   - 使用 `gh pr view <number>` 获取 PR 信息
   - 使用 `gh pr diff <number>` 获取代码差异

2. **用户提供提交 hash 或 "commit"**
   - 单个提交: `git show <hash>`
   - 提交之后: `git diff <hash>..HEAD`
   - 提交范围: `git diff <hash1>..<hash2>`

3. **用户提到 "branch" 或 "分支"**
   - 使用 `git diff <base-branch>...HEAD`
   - 先用 `git branch --show-current` 确认当前分支

4. **用户提到 "staged" 或 "暂存"**
   - 使用 `git diff --cached`

5. **没有明确指定（默认）**
   - 先运行 `git status --short` 查看状态
   - 如果有暂存/未暂存变更，运行 `git diff HEAD`
   - 如果工作区干净，比较当前分支与主分支
```

### 6.2 工具调用最佳实践

```markdown
## 工具调用最佳实践

### git 命令

1. **总是先用 `git status --short` 了解当前状态**
2. **使用三点表示法 `...` 进行分支比较**
   - `git diff main...HEAD` 只显示分支分叉后的变更
   - `git diff main..HEAD` 显示所有差异（包括 main 上的新提交）
3. **对于大型 diff，考虑使用 `--stat` 先查看文件列表**
4. **使用 `git log --oneline -n 10` 了解最近的提交历史**

### gh 命令

1. **先用 `--json` 获取 PR 元数据**
2. **再用 `gh pr diff` 获取代码差异**
3. **注意 PR 可能来自 fork，需要正确处理**

### read_file

1. **优先读取变更的文件，而非依赖 diff**
2. **检查项目根目录的 AGENTS.md, CLAUDE.md**
3. **对于大型文件，关注变更相关的部分**
```

---

## 7. 测试计划

### 7.1 单元测试

- [ ] `read_file` 工具测试
- [ ] `write_file` 工具测试
- [ ] `git` 工具测试（mock）
- [ ] `gh` 工具测试（mock）

### 7.2 集成测试

- [ ] 分支对比审查
- [ ] 提交范围审查
- [ ] PR 审查（需要真实 GitHub 仓库）
- [ ] 暂存变更审查

### 7.3 端到端测试

- [ ] 完整审查流程（真实 LLM 调用）
- [ ] 多轮对话场景
- [ ] 错误处理场景

---

## 8. 后续优化

### 8.1 性能优化

- 并行读取多个文件
- 缓存 git 命令结果
- 增量审查（只审查新变更）

### 8.2 功能增强

- 支持自定义审查规则
- 集成 lint 工具结果
- 支持多语言代码审查
- 生成 GitHub PR 评论

### 8.3 用户体验

- 进度条显示
- 彩色输出
- 交互式模式
- VS Code 集成

---

## 9. 总结

本设计文档描述了一个基于 simple-agent 框架的 CodeReview Agent，具备以下特点：

1. **四个核心工具**：read_file, write_file, git, gh
2. **多种审查模式**：分支、提交、PR、文件等
3. **智能上下文获取**：自动读取完整文件和项目规范
4. **规范化输出**：按严重程度分类的审查报告

通过完善的 System Prompt 和工具设计，Agent 能够理解用户的自然语言请求，自动选择正确的工具和命令，执行完整的代码审查流程。
