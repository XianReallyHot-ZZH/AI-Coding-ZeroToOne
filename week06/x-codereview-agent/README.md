# CodeReview Agent

一个基于 `x-simple-agent` SDK 构建的智能代码审查代理，支持多种审查场景。

## 特性

- **多场景审查**：支持 branch diff、commit diff、PR diff、uncommitted changes 等多种场景
- **深度分析**：通过读取完整文件内容，理解代码上下文
- **规范检查**：自动检测并遵循项目编码规范（AGENTS.md、CLAUDE.md 等）
- **结构化输出**：按严重程度分类的问题报告

## 安装

```bash
pnpm install
```

## 使用方法

### CLI 使用

```bash
# 审查当前分支相对于 master 的新代码
pnpm dev "review current branch new code"

# 审查某个 commit 之后的代码变更
pnpm dev "review commit 13bad5"

# 审查特定 Pull Request
pnpm dev "review PR #12"

# 审查未提交的变更
pnpm dev "review uncommitted changes"

# 审查特定文件
pnpm dev "review src/auth/login.ts"
```

### 编程使用

```typescript
import { createCodeReviewAgent } from "x-codereview-agent"

const agent = createCodeReviewAgent({
  provider: "openai",
  model: "gpt-4o",
  apiKey: process.env.OPENAI_API_KEY,
})

// 非流式调用
const messages = await agent.run("review current branch changes")
console.log(agent.getLastResponse())

// 流式调用
for await (const event of agent.stream("review uncommitted changes")) {
  if (event.type === "text") {
    process.stdout.write(event.text)
  }
}
```

## 环境变量

```bash
# LLM Provider
PROVIDER=openai          # or deepseek
MODEL=gpt-4o             # or deepseek-chat

# API Keys
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx
```

## 工具

CodeReview Agent 提供以下工具：

| 工具 | 描述 |
|------|------|
| `read_file` | 读取文件内容，获取代码上下文 |
| `write_file` | 写入文件，用于生成审查报告 |
| `git_command` | 执行 Git 命令，获取代码变更信息 |
| `gh_command` | 执行 GitHub CLI 命令，获取 PR 信息 |

## 审查场景

### 1. Branch Review

审查当前分支相对于主分支的变更：

```bash
pnpm dev "review current branch"
```

### 2. Commit Review

审查某个 commit 之后的所有变更：

```bash
pnpm dev "review commit abc123"
```

### 3. PR Review

审查指定的 Pull Request：

```bash
pnpm dev "review PR #12"
```

### 4. Uncommitted Changes

审查未提交的变更：

```bash
pnpm dev "review uncommitted changes"
```

### 5. File Review

审查特定文件：

```bash
pnpm dev "review src/auth/login.ts"
```

## 输出格式

审查报告按以下结构组织：

```markdown
# Code Review Report

## Summary
变更概述和总体评估

## Critical Issues 🔴
必须修复的问题（bug、安全漏洞、破坏性变更）

## Important Issues 🟡
应该解决的问题（性能、可维护性、最佳实践）

## Suggestions 🟢
次要改进和可选增强

## Positive Observations ✅
值得注意的良好实践
```

## 构建

```bash
pnpm build
```

## 测试

```bash
pnpm test
```

## 依赖

- `x-simple-agent` - 底层 Agent SDK
