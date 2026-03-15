/**
 * Built-in tools index
 */

import type { Tool } from "../../types/index.js"
import { bashTool } from "./bash.js"
import { readTool } from "./read.js"
import { writeTool } from "./write.js"
import { httpTool } from "./http.js"

export { bashTool, readTool, writeTool, httpTool }

/**
 * All built-in tools
 */
export const allBuiltinTools: Tool[] = [
  bashTool,
  readTool,
  writeTool,
  httpTool,
]
