/**
 * read_file Tool
 *
 * Reads the contents of a file from the current working directory.
 */

import { z } from "zod";
import { defineTool } from "simple-agent";
import type { ToolResult } from "simple-agent";
import { readFile } from "fs/promises";
import { resolve } from "path";

export const readFileTool = defineTool("read_file", {
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

  execute: async (args): Promise<ToolResult> => {
    try {
      const fullPath = resolve(process.cwd(), args.path);
      const content = await readFile(fullPath, "utf-8");

      return {
        title: args.path,
        output: content,
        metadata: {
          path: args.path,
          size: content.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to read file '${args.path}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
