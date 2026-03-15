/**
 * write_file Tool
 *
 * Writes content to a file in the current working directory.
 */

import { z } from "zod";
import { defineTool } from "simple-agent";
import type { ToolResult } from "simple-agent";
import { writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";

export const writeFileTool = defineTool("write_file", {
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

  execute: async (args): Promise<ToolResult> => {
    try {
      const fullPath = resolve(process.cwd(), args.path);
      const dir = dirname(fullPath);

      // 确保目录存在
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, args.content, "utf-8");

      return {
        title: args.path,
        output: `Successfully wrote ${args.content.length} bytes to ${args.path}`,
        metadata: {
          path: args.path,
          size: args.content.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to write file '${args.path}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
