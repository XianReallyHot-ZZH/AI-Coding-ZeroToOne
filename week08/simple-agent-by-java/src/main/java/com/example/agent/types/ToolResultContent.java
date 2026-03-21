package com.example.agent.types;

/**
 * 工具结果内容
 */
public record ToolResultContent(
    String toolCallId,
    String result,
    boolean isError
) implements MessageContent {
}
