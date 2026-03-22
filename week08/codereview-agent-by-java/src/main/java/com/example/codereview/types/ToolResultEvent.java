package com.example.codereview.types;

/**
 * 工具结果事件
 */
public record ToolResultEvent(String id, String name, String result, boolean isError) implements AgentEvent {
}
