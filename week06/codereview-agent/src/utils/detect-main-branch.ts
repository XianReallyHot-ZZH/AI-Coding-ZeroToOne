/**
 * Main Branch Detection Utility
 *
 * Detects the main branch of the repository by checking common branch names.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * List of candidate branch names to check, in order of preference.
 */
const CANDIDATE_BRANCHES = ["main", "master", "develop", "staging"];

/**
 * Detects the main branch of the current repository.
 *
 * Iterates through common branch names and returns the first one that exists.
 * Falls back to "main" if no candidate branches are found.
 *
 * @returns The name of the main branch
 */
export async function detectMainBranch(): Promise<string> {
  for (const branch of CANDIDATE_BRANCHES) {
    try {
      await execAsync(`git rev-parse --verify ${branch}`, {
        cwd: process.cwd(),
      });
      return branch;
    } catch {
      continue;
    }
  }

  // Default fallback
  return "main";
}

/**
 * Gets the current branch name.
 *
 * @returns The name of the current branch
 */
export async function getCurrentBranch(): Promise<string> {
  try {
    const { stdout } = await execAsync("git branch --show-current", {
      cwd: process.cwd(),
    });
    return stdout.trim();
  } catch {
    throw new Error("Failed to get current branch name");
  }
}

/**
 * Checks if the current directory is a git repository.
 *
 * @returns true if inside a git repository
 */
export async function isGitRepository(): Promise<boolean> {
  try {
    await execAsync("git rev-parse --is-inside-work-tree", {
      cwd: process.cwd(),
    });
    return true;
  } catch {
    return false;
  }
}
