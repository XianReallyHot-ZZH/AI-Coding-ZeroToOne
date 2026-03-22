package com.example.codereview.types;

/**
 * 错误事件
 */
public record ErrorEvent(String message, Throwable cause) implements AgentEvent {
}
