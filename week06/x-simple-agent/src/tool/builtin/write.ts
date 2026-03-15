/**
 * Write Tool - Write content to files
 */

import type { Tool } from "../../types/index.js"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"

export const writeTool: Tool = {
  name: "write_file",
  description: "Write content to a file on the local filesystem. Creates the file if it doesn't exist, and creates parent directories if needed.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The absolute path to the file to write",
      },
      content: {
        type: "string",
        description: "The content to write to the file",
      },
      encoding: {
        type: "string",
        description: "The encoding to use (default: utf-8)",
        enum: ["utf-8", "base64", "hex"],
      },
    },
    required: ["path", "content"],
  },
  execute: async (args: unknown) => {
    const { path, content, encoding = "utf-8" } = args as {
      path: string
      content: string
      encoding?: BufferEncoding
    }

    try {
      // Create parent directories if they don't exist
      const parentDir = dirname(path)
      await mkdir(parentDir, { recursive: true })

      // Write file content
      await writeFile(path, content, encoding)

      return {
        output: `Successfully wrote ${content.length} characters to ${path}`,
        metadata: {
          path,
          size: content.length,
        },
      }
    } catch (error: unknown) {
      const err = error as Error & { code?: string }
      let errorMessage = err.message

      if (err.code === "EACCES") {
        errorMessage = `Permission denied: ${path}`
      } else if (err.code === "EISDIR") {
        errorMessage = `Path is a directory: ${path}`
      }

      return {
        output: "",
        error: errorMessage,
      }
    }
  },
}
