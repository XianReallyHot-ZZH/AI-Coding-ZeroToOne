# CodeReview Agent

AI 驱动的代码审查 Agent，基于 `simple-agent` 框架构建。

## 功能特性

- **多种审查模式**：支持分支对比、提交对比、PR 审查、文件审查等多种场景
- **上下文感知**：不仅查看 diff，还会读取完整文件内容以理解上下文
- **智能工具调用**：自动选择合适的 git/gh 命令获取代码差异
- **规范化输出**：按严重程度分类输出审查结果
- **多模型支持**：支持 OpenAI、DeepSeek 及 OpenAI 兼容的 API

## 安装

```bash
# 在项目根目录
pnpm install

# 构建
pnpm build
```

## 使用方法

### 环境变量设置

```bash
# OpenAI
export OPENAI_API_KEY="your-openai-api-key"

# DeepSeek
export DEEPSEEK_API_KEY="your-deepseek-api-key"
```

### CLI 使用

```bash
# 使用 OpenAI（默认）
pnpm review

# 使用 DeepSeek
pnpm review -- --provider deepseek

# 使用 DeepSeek 并指定模型
pnpm review -- --provider deepseek --model deepseek-reasoner

# 使用自定义 OpenAI 兼容 API
pnpm review -- --provider openai-compatible --base-url https://your-api.com/v1

# 审查当前分支相对于 develop 的新代码
pnpm review -- --base develop

# 审查特定提交之后的所有变更
pnpm review -- "abc123..HEAD"

# 审查特定 PR
pnpm review -- "pr:12"
# 或
pnpm review -- "12"

# 审查特定文件
pnpm review -- "src/auth/*.ts"

# 输出报告到文件
pnem review -- -o review-report.md

# 交互模式（支持多轮对话）
pnpm review -- -i

# 完整参数示例
pnpm review -- --provider deepseek --model deepseek-chat --base develop -i
```

### CLI 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-p, --provider <provider>` | LLM 提供商: openai, deepseek, openai-compatible | openai |
| `-m, --model <model>` | 使用的模型 | openai: gpt-4o, deepseek: deepseek-chat |
| `--base-url <url>` | API Base URL（用于自定义端点） | - |
| `--api-key <key>` | API Key（也可通过环境变量设置） | - |
| `-b, --base <branch>` | 基准分支 | 自动检测 main/master |
| `-o, --output <file>` | 输出报告到文件 | - |
| `-i, --interactive` | 交互模式 | false |

### 编程使用

```typescript
import { createCodeReviewAgent, runCodeReview } from "codereview-agent";

// 使用 OpenAI（默认）
const result = await runCodeReview("帮我审查当前分支新代码");

// 使用 DeepSeek
const { agent } = createCodeReviewAgent({
  provider: "deepseek",
  model: "deepseek-chat",
});

// 第一轮
await agent.run("审查 main...HEAD 的代码变更");

// 继续对话（保留上下文）
await agent.run("请详细解释第一个问题");

// 使用自定义 OpenAI 兼容 API
const { agent: customAgent } = createCodeReviewAgent({
  provider: "openai-compatible",
  baseURL: "https://your-api.com/v1",
  model: "your-model",
  apiKey: "your-api-key",
});
```

## 支持的 Provider

### OpenAI（默认）

```bash
export OPENAI_API_KEY="sk-..."
pnpm review
```

支持模型：`gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, 等

### DeepSeek

```bash
export DEEPSEEK_API_KEY="sk-..."
pnpm review -- --provider deepseek
```

支持模型：
- `deepseek-chat` - 通用对话模型（默认）
- `deepseek-reasoner` - 推理增强模型

### OpenAI 兼容 API

适用于任何兼容 OpenAI API 格式的服务：

```bash
pnpm review -- --provider openai-compatible --base-url https://api.example.com/v1
```

## 工具

CodeReview Agent 提供以下工具：

### read_file
读取文件内容，用于获取完整文件上下文。

### write_file
写入内容到文件，用于创建审查报告。

### git
执行 git 命令，获取代码变更和仓库状态。

### gh
执行 GitHub CLI 命令，获取 PR 信息。

## 审查类型

| 输入示例 | 审查类型 | 使用的命令 |
|---------|---------|-----------|
| 无参数 | 未提交变更/分支差异 | `git diff HEAD` 或 `git diff main...HEAD` |
| `abc123` | 单次提交 | `git show abc123` |
| `abc123..HEAD` | 提交范围 | `git diff abc123..HEAD` |
| `pr:12` 或 `12` | PR 审查 | `gh pr diff 12` |
| `feature/auth` | 分支对比 | `git diff main...feature/auth` |
| `src/*.ts` | 文件审查 | `read_file` |

## 输出格式

审查结果按严重程度分类：

1. **Critical Issues** - 必须在合并前修复
2. **High Priority** - 应该修复，会导致问题
3. **Medium Priority** - 值得处理
4. **Suggestions** - 可选改进
5. **Summary** - 整体评估

## 配置

Agent 的行为可以通过 `AGENTS.md` 文件进行配置。在项目中放置 `AGENTS.md` 文件可以定义代码规范和审查规则。

## 依赖

- `simple-agent`: 底层 agent 框架
- `commander`: CLI 框架
- `zod`: 参数验证
