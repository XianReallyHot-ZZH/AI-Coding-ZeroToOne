/**
 * HTTP Tool - Make HTTP requests
 */

import type { Tool } from "../../types/index.js"

interface HttpArgs {
  url: string
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

export const httpTool: Tool = {
  name: "http_request",
  description: "Make an HTTP request to a URL and return the response. Supports GET, POST, PUT, DELETE, and PATCH methods.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to request",
      },
      method: {
        type: "string",
        description: "HTTP method (default: GET)",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
      headers: {
        type: "object",
        description: "HTTP headers to send",
      },
      body: {
        type: "string",
        description: "Request body (for POST/PUT/PATCH)",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)",
      },
    },
    required: ["url"],
  },
  execute: async (args: unknown) => {
    const { url, method = "GET", headers: requestHeaders = {}, body, timeout = 30000 } = args as HttpArgs

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...requestHeaders,
        },
        signal: controller.signal,
      }

      if (body && ["POST", "PUT", "PATCH"].includes(method)) {
        fetchOptions.body = body
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const responseText = await response.text()

      let output = `HTTP ${response.status} ${response.statusText}\n`
      output += `URL: ${url}\n\n`
      output += responseText

      // Extract headers into a plain object
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return {
        output,
        metadata: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        },
      }
    } catch (error: unknown) {
      const err = error as Error
      let errorMessage = err.message

      if (err.name === "AbortError") {
        errorMessage = `Request timed out after ${timeout}ms`
      }

      return {
        output: "",
        error: `HTTP request failed: ${errorMessage}`,
      }
    }
  },
}
