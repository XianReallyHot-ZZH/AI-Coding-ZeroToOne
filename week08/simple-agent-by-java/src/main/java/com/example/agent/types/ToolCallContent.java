package com.example.agent.types;

import java.util.Map;

/**
 * 工具调用内容
 */
public record ToolCallContent(
    String id,
    String name,
    Map<String, Object> arguments
) implements MessageContent {
}
