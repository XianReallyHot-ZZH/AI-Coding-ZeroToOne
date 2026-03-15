/**
 * Read Tool - Read file contents
 */

import type { Tool } from "../../types/index.js"
import { readFile, stat } from "fs/promises"

export const readTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file from the local filesystem. Returns the file content as a string.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The absolute path to the file to read",
      },
      encoding: {
        type: "string",
        description: "The encoding to use (default: utf-8)",
        enum: ["utf-8", "base64", "hex"],
      },
    },
    required: ["path"],
  },
  execute: async (args: unknown) => {
    const { path, encoding = "utf-8" } = args as { path: string; encoding?: BufferEncoding }

    try {
      // Check if file exists and get stats
      const stats = await stat(path)

      if (!stats.isFile()) {
        return {
          output: "",
          error: `Path is not a file: ${path}`,
        }
      }

      // Read file content
      const content = await readFile(path, encoding)

      return {
        output: content,
        metadata: {
          path,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        },
      }
    } catch (error: unknown) {
      const err = error as Error & { code?: string }
      let errorMessage = err.message

      if (err.code === "ENOENT") {
        errorMessage = `File not found: ${path}`
      } else if (err.code === "EACCES") {
        errorMessage = `Permission denied: ${path}`
      }

      return {
        output: "",
        error: errorMessage,
      }
    }
  },
}
