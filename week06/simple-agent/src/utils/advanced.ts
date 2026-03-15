// ============================================
// Doom Loop Detection
// ============================================

export class DoomLoopDetector {
  private history: Map<string, string[]> = new Map();
  private threshold: number;

  constructor(threshold: number = 3) {
    this.threshold = threshold;
  }

  check(toolName: string, input: unknown): boolean {
    const key = toolName;
    const history = this.history.get(key) || [];

    // Add current input to history
    history.push(JSON.stringify(input));

    // Keep only last N entries
    if (history.length > this.threshold) {
      history.shift();
    }

    this.history.set(key, history);

    // Check if all recent calls are identical
    if (history.length >= this.threshold) {
      const allSame = history.every((h) => h === history[0]);
      if (allSame) {
        return true; // Doom loop detected!
      }
    }

    return false;
  }

  reset(): void {
    this.history.clear();
  }
}

// ============================================
// Retry Logic with Exponential Backoff
// ============================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = config.retryableErrors.some(
        (err) => lastError?.message.includes(err)
      );

      if (!isRetryable || attempt === config.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      );

      console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================
// Token Counter (Simple Implementation)
// ============================================

export function estimateTokens(text: string): number {
  // Simple estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

// ============================================
// ID Generator
// ============================================

export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
