package com.example.agent.metrics;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Agent 健康检查指示器
 */
@Component
@ConditionalOnProperty(name = "management.endpoint.health.show-details", havingValue = "always")
public class AgentHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(AgentHealthIndicator.class);

    private final ChatModel chatModel;

    public AgentHealthIndicator(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @Override
    public Health health() {
        try {
            // 简单的健康检查 - 检查 ChatModel 是否可用
            // 不实际调用 API，只检查 bean 是否存在
            return Health.up()
                .withDetail("status", "healthy")
                .withDetail("chatModel", chatModel.getClass().getSimpleName())
                .withDetail("timestamp", System.currentTimeMillis())
                .build();
        } catch (Exception e) {
            log.error("Health check failed", e);
            return Health.down()
                .withException(e)
                .build();
        }
    }
}
