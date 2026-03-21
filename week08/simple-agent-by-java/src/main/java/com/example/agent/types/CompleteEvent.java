package com.example.agent.types;

/**
 * 完成事件
 */
public record CompleteEvent(String finishReason, Usage usage) implements AgentEvent {
}
