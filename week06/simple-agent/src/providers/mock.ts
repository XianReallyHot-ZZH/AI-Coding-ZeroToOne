import {
  LLMProvider,
  LLMChunk,
  LLMStreamOptions,
  Message,
  AssistantMessage,
  Tool,
} from "../types.js";

// ============================================
// Mock LLM Provider (for Testing)
// ============================================

export class MockLLMProvider implements LLMProvider {
  private responses: LLMChunk[][] = [];
  private callCount = 0;

  // Queue a response sequence
  queueResponse(chunks: LLMChunk[]): void {
    this.responses.push(chunks);
  }

  // Queue a simple text response
  queueTextResponse(text: string): void {
    this.responses.push([
      { type: "text", content: text },
      { type: "done", finishReason: "stop" },
    ]);
  }

  // Queue a tool call response
  queueToolCallResponse(
    toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>,
    textPrefix?: string
  ): void {
    const chunks: LLMChunk[] = [];

    if (textPrefix) {
      chunks.push({ type: "text", content: textPrefix });
    }

    for (const tc of toolCalls) {
      chunks.push({
        type: "tool_call",
        toolCall: tc,
      });
    }

    chunks.push({ type: "done", finishReason: "tool_calls" });
    this.responses.push(chunks);
  }

  async *stream(
    messages: Message[],
    tools: Tool[],
    options?: LLMStreamOptions
  ): AsyncIterable<LLMChunk> {
    this.callCount++;
    const response = this.responses.shift();

    if (!response) {
      yield { type: "error", content: "No queued response" };
      return;
    }

    for (const chunk of response) {
      // Simulate async streaming
      await new Promise((resolve) => setTimeout(resolve, 10));
      yield chunk;
    }
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.responses = [];
    this.callCount = 0;
  }

  hasRemainingResponses(): boolean {
    return this.responses.length > 0;
  }
}

// ============================================
// Mock LLM Provider Factory
// ============================================

export function createMockProvider(): MockLLMProvider {
  return new MockLLMProvider();
}
