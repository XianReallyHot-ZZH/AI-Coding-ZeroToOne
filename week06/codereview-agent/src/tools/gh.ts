/**
 * gh Tool
 *
 * Executes GitHub CLI (gh) commands to interact with Pull Requests and GitHub features.
 */

import { z } from "zod";
import { defineTool } from "simple-agent";
import type { ToolResult } from "simple-agent";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const ghCommandTool = defineTool("gh", {
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
    command: z
      .string()
      .describe("gh 命令（不包含 'gh' 前缀），如 'pr view 123'"),
  }),

  execute: async (args): Promise<ToolResult> => {
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
      throw new Error(
        `gh ${args.command} failed: ${execError.stderr || execError.message}`
      );
    }
  },
});
