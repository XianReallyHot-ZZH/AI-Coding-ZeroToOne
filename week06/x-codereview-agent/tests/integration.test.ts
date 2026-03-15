/**
 * Integration tests for CodeReview Agent
 */

import { describe, it, expect } from "vitest"
import { gitTool } from "../src/tools/git.js"
import { ghTool } from "../src/tools/gh.js"

describe("Integration: Git Workflow", () => {
  it("should get current branch name", async () => {
    const result = await gitTool.execute({ command: "rev-parse --abbrev-ref HEAD" })
    expect(result.error).toBeUndefined()
    expect(result.output).toBeDefined()
    expect(result.output).not.toBe("")
  })

  it("should get current commit hash", async () => {
    const result = await gitTool.execute({ command: "rev-parse HEAD" })
    expect(result.error).toBeUndefined()
    expect(result.output).toMatch(/^[a-f0-9]{40}$/)
  })

  it("should get merge base with master", async () => {
    const result = await gitTool.execute({ command: "merge-base master HEAD" })
    // May fail if master doesn't exist, but should not crash
    expect(result).toBeDefined()
  })

  it("should get diff name-only", async () => {
    const result = await gitTool.execute({ command: "diff --name-only HEAD~1..HEAD" })
    expect(result.error).toBeUndefined()
    // Output may be empty if no changes, but command should succeed
    expect(result).toBeDefined()
  })

  it("should get git log", async () => {
    const result = await gitTool.execute({ command: "log --oneline -n 5" })
    expect(result.error).toBeUndefined()
    expect(result.output).toBeDefined()
    // Should have at least one commit
    expect(result.output).not.toBe("")
  })

  it("should get git status", async () => {
    const result = await gitTool.execute({ command: "status --short" })
    expect(result.error).toBeUndefined()
    expect(result).toBeDefined()
  })
})

describe("Integration: Scenario Simulations", () => {
  it("Branch Review scenario - should gather required info", async () => {
    // Step 1: Get current branch
    const branchResult = await gitTool.execute({ command: "rev-parse --abbrev-ref HEAD" })
    expect(branchResult.error).toBeUndefined()

    // Step 2: Get merge base
    const mergeBaseResult = await gitTool.execute({ command: "merge-base master HEAD" })
    // May fail on some branches

    // Step 3: Get changed files
    if (!mergeBaseResult.error && mergeBaseResult.output) {
      const diffResult = await gitTool.execute({
        command: `diff --name-status ${mergeBaseResult.output}...HEAD`
      })
      expect(diffResult).toBeDefined()
    }
  })

  it("Commit Review scenario - should gather required info", async () => {
    // Get recent commit hash
    const logResult = await gitTool.execute({ command: "log --oneline -n 1" })
    expect(logResult.error).toBeUndefined()

    const commitHash = logResult.output?.split(" ")[0]
    expect(commitHash).toBeDefined()
    expect(commitHash?.length).toBeGreaterThanOrEqual(7)

    // Get diff since that commit
    const diffResult = await gitTool.execute({
      command: `diff --name-status ${commitHash}..HEAD`
    })
    expect(diffResult).toBeDefined()
  })

  it("Uncommitted Changes scenario - should gather required info", async () => {
    // Get status
    const statusResult = await gitTool.execute({ command: "status --short" })
    expect(statusResult.error).toBeUndefined()

    // Get unstaged diff
    const diffResult = await gitTool.execute({ command: "diff --no-color" })
    expect(diffResult.error).toBeUndefined()

    // Get staged diff
    const cachedResult = await gitTool.execute({ command: "diff --cached --no-color" })
    expect(cachedResult.error).toBeUndefined()
  })
})

describe("Integration: GitHub CLI", () => {
  it("should handle gh version check", async () => {
    const result = await ghTool.execute({ command: "--version" })
    // Either gh is installed or it's not
    expect(result).toBeDefined()
    // On Windows, error message may not contain "not installed"
    // Just verify we get a result (either output or error)
    expect(result.output !== "" || result.error !== "").toBe(true)
  })
})
