/**
 * git Tool
 *
 * Executes git commands to inspect repository state and code changes.
 */

import { z } from "zod";
import { defineTool } from "simple-agent";
import type { ToolResult } from "simple-agent";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const gitCommandTool = defineTool("git", {
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
| 审查PR变更 | \`git diff main...HEAD\` (假设main是目标分支) |`,

  parameters: z.object({
    command: z
      .string()
      .describe("git 命令（不包含 'git' 前缀），如 'diff main...HEAD'"),
  }),

  execute: async (args): Promise<ToolResult> => {
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
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
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
      throw new Error(
        `git ${args.command} failed: ${execError.stderr || execError.message}`
      );
    }
  },
});
