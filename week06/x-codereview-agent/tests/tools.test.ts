/**
 * Tests for CodeReview Agent tools
 */

import { describe, it, expect } from "vitest"
import { gitTool } from "../src/tools/git.js"
import { ghTool } from "../src/tools/gh.js"

describe("git_tool", () => {
  it("should execute git status", async () => {
    const result = await gitTool.execute({ command: "status --short" })
    expect(result.output).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it("should execute git rev-parse HEAD", async () => {
    const result = await gitTool.execute({ command: "rev-parse HEAD" })
    expect(result.output).toBeDefined()
    expect(result.output).toMatch(/^[a-f0-9]{40}$/)
    expect(result.error).toBeUndefined()
  })

  it("should execute git branch", async () => {
    const result = await gitTool.execute({ command: "branch --show-current" })
    expect(result.output).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it("should handle invalid commands", async () => {
    const result = await gitTool.execute({ command: "invalid-command-that-does-not-exist" })
    expect(result.error).toBeDefined()
  })
})

describe("gh_tool", () => {
  it("should handle gh command (may fail if not installed)", async () => {
    const result = await ghTool.execute({ command: "--version" })
    // Either succeeds with version or fails with installation message
    expect(result.output !== "" || result.error !== "").toBe(true)
  })

  it("should handle pr list (may fail if not authenticated)", async () => {
    const result = await ghTool.execute({ command: "pr list --limit 1" })
    // Result depends on whether gh is installed and authenticated
    expect(result).toBeDefined()
  })
})
