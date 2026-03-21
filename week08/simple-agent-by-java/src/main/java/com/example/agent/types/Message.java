package com.example.agent.types;

import java.time.Instant;
import java.util.List;

/**
 * 消息记录
 */
public record Message(
    String id,
    MessageRole role,
    List<MessageContent> content,
    Instant createdAt
) {
}
