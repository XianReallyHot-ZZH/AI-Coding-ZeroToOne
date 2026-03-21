package com.example.agent.types;

/**
 * 工具调用事件
 */
public record ToolCallEvent(String id, String name, Object args) implements AgentEvent {
}
