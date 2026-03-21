package com.example.agent.types;

/**
 * 消息内容 - Sealed Interface
 */
public sealed interface MessageContent permits TextContent, ToolCallContent, ToolResultContent {
}
