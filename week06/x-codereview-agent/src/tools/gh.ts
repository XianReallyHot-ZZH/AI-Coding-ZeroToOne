/**
 * GitHub CLI Tool - Execute gh commands for PR review
 */

import type { Tool } from "x-simple-agent"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const ghTool: Tool = {
  name: "gh_command",
  description: `Execute GitHub CLI (gh) commands to interact with Pull Requests.

Common command patterns:

1. **View Pull Request**
   - gh pr view <number>         # View PR details
   - gh pr view <number> --json title,body,author,state

2. **Get PR Diff**
   - gh pr diff <number>         # Get PR's code diff

3. **Get PR List**
   - gh pr list                  # List current repo's PRs
   - gh pr list --author @me     # List PRs I created
   - gh pr list --state open     # List open PRs

4. **Get PR Comments**
   - gh api repos/{owner}/{repo}/pulls/{number}/comments

5. **Get PR Check Status**
   - gh pr checks <number>

6. **Get Repository Info**
   - gh repo view                # View current repo info
   - gh repo view --json name,owner

Prerequisites:
- Need to run 'gh auth login' first for authentication
- Need to run in a git repo directory`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The gh command to execute (without 'gh' prefix)",
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
      const { stdout, stderr } = await execAsync(`gh ${command}`, {
        timeout,
        maxBuffer: 1024 * 1024 * 10,
      })

      let output = ""
      if (stdout) output += stdout
      if (stderr) output += `\n[stderr]: ${stderr}`

      return { output: output.trim() || "Command executed successfully" }
    } catch (error: unknown) {
      const err = error as Error & { stdout?: string; stderr?: string; killed?: boolean }
      let errorMessage = err.message

      if (err.killed) {
        errorMessage = `Command timed out after ${timeout}ms`
      }

      // Check if gh is not installed
      if (err.message.includes("'gh' not found") || err.message.includes("command not found")) {
        errorMessage = "GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com/"
      }

      // Check if not authenticated
      if (err.stderr?.includes("not logged into any GitHub hosts")) {
        errorMessage = "Not authenticated with GitHub CLI. Run 'gh auth login' first."
      }

      if (err.stdout || err.stderr) {
        errorMessage += `\n[stdout]: ${err.stdout || ""}\n[stderr]: ${err.stderr || ""}`
      }

      return { output: "", error: errorMessage }
    }
  },
}
