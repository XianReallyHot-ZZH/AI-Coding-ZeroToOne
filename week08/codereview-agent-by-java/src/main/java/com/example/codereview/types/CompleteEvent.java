package com.example.codereview.types;

/**
 * 完成事件
 */
public record CompleteEvent(String finishReason, Usage usage) implements AgentEvent {
}
