/**
 * Bash Tool - Execute shell commands
 */

import type { Tool } from "../../types/index.js"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const bashTool: Tool = {
  name: "bash",
  description: "Execute a shell command and return the output. Use this for system operations like listing files, running scripts, etc.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)",
      },
    },
    required: ["command"],
  },
  execute: async (args: unknown) => {
    const { command, timeout = 30000 } = args as { command: string; timeout?: number }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      })

      let output = ""
      if (stdout) output += stdout
      if (stderr) output += `\n[stderr]: ${stderr}`

      return {
        output: output.trim() || "Command executed successfully (no output)",
      }
    } catch (error: unknown) {
      const err = error as Error & { stdout?: string; stderr?: string; killed?: boolean }
      let errorMessage = err.message

      if (err.killed) {
        errorMessage = `Command timed out after ${timeout}ms`
      }

      if (err.stdout || err.stderr) {
        errorMessage += `\n[stdout]: ${err.stdout || ""}\n[stderr]: ${err.stderr || ""}`
      }

      return {
        output: "",
        error: errorMessage,
      }
    }
  },
}
