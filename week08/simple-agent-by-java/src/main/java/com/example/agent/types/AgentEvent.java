package com.example.agent.types;

/**
 * Agent 响应事件 - Sealed Interface
 */
public sealed interface AgentEvent permits TextEvent, ToolCallEvent, ToolResultEvent, ErrorEvent, CompleteEvent {
}
