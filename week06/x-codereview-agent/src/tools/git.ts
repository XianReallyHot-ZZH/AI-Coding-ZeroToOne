/**
 * Git Tool - Execute git commands for code review
 */

import type { Tool } from "x-simple-agent"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const gitTool: Tool = {
  name: "git_command",
  description: `Execute git commands to inspect repository state and changes.

Common command patterns:

1. **Get changed file list**
   - git status --short
   - git diff --name-only

2. **Get unstaged changes**
   - git diff

3. **Get staged changes**
   - git diff --cached

4. **Get branch diff**
   - git diff master...HEAD      # Current branch vs master
   - git diff origin/main...HEAD # Current branch vs remote main

5. **Get specific commit changes**
   - git show <commit>           # View a commit's details
   - git show <commit> --stat    # View file change stats

6. **Get commit range changes**
   - git diff <commit1>..<commit2>

7. **Get commit history**
   - git log --oneline -n 20
   - git log -p <file>           # View a file's change history

8. **Code blame**
   - git blame <file>            # View each line's author and time
   - git log -p <file>           # View file's complete change history

9. **Branch info**
   - git branch -a               # List all branches
   - git rev-parse HEAD          # Get current commit hash
   - git merge-base master HEAD  # Get fork point with master

Notes:
- Use --no-color to avoid color code interference
- Large diffs may need pagination or output limits`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The git command to execute (without 'git' prefix)",
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
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
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

      // Check if not in a git repo
      if (err.stderr?.includes("not a git repository")) {
        errorMessage = "Not in a git repository. Please run from a git project directory."
      }

      if (err.stdout || err.stderr) {
        errorMessage += `\n[stdout]: ${err.stdout || ""}\n[stderr]: ${err.stderr || ""}`
      }

      return { output: "", error: errorMessage }
    }
  },
}
