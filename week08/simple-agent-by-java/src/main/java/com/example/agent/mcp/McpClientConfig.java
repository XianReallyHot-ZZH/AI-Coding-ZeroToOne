package com.example.agent.mcp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MCP 工具配置
 * 仅在 MCP 启用时生效
 */
@Configuration
@ConditionalOnProperty(name = "spring.ai.mcp.client.enabled", havingValue = "true")
public class McpClientConfig {

    private static final Logger log = LoggerFactory.getLogger(McpClientConfig.class);

    /**
     * MCP 工具回调提供者
     * Spring AI MCP Starter 会自动配置 MCP 工具
     */
    @Bean
    public ToolCallbackProvider mcpToolCallbackProvider() {
        log.info("MCP ToolCallbackProvider configured");
        // MCP 工具由 Spring AI MCP Starter 自动注册
        return () -> new org.springframework.ai.tool.ToolCallback[0];
    }
}
