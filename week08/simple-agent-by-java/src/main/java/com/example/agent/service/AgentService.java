package com.example.agent.service;

import com.example.agent.config.AgentProperties;
import com.example.agent.metrics.AgentMetrics;
import com.example.agent.types.AgentEvent;
import com.example.agent.types.CompleteEvent;
import com.example.agent.types.TextEvent;
import com.example.agent.types.Usage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Agent 服务 - 核心业务逻辑
 */
@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final ChatClient chatClient;
    private final ChatModel chatModel;
    private final AgentProperties properties;
    private final List<ToolCallback> allTools;
    private final AgentMetrics metrics;

    public AgentService(
            ChatModel chatModel,
            AgentProperties properties,
            ToolCallbackProvider builtinToolCallbackProvider,
            AgentMetrics metrics) {

        this.chatModel = chatModel;
        this.properties = properties;
        this.metrics = metrics;

        // 获取内置工具
        this.allTools = new ArrayList<>(Arrays.asList(builtinToolCallbackProvider.getToolCallbacks()));

        log.info("Total tools available: {} - {}", allTools.size(),
            allTools.stream().map(ToolCallback::getToolDefinition).map(d -> d.name()).toList());

        // 构建 ChatClient
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem(properties.getSystemPrompt())
            .defaultToolCallbacks(allTools)
            .build();

        log.info("AgentService initialized with model: {}", properties.getDefaultModel());
    }

    /**
     * 获取可用工具列表
     *
     * @return 工具名称列表
     */
    public List<String> getAvailableTools() {
        return allTools.stream()
            .map(ToolCallback::getToolDefinition)
            .map(d -> d.name())
            .toList();
    }

    /**
     * 同步调用
     *
     * @param sessionId   会话 ID
     * @param userMessage 用户消息
     * @return 响应内容
     */
    public String chat(String sessionId, String userMessage) {
        log.debug("Chat request - sessionId: {}, message: {}", sessionId, userMessage);
        long startTime = System.currentTimeMillis();

        try {
            metrics.recordRequest();

            String response = chatClient.prompt()
                .user(userMessage)
                .call()
                .content();

            metrics.recordDuration(System.currentTimeMillis() - startTime);
            log.debug("Chat response - sessionId: {}, length: {}", sessionId,
                response != null ? response.length() : 0);

            return response;

        } catch (Exception e) {
            metrics.recordError();
            throw e;
        }
    }

    /**
     * 流式调用
     *
     * @param sessionId   会话 ID
     * @param userMessage 用户消息
     * @return 事件流
     */
    public Flux<AgentEvent> chatStream(String sessionId, String userMessage) {
        log.debug("Stream request - sessionId: {}, message: {}", sessionId, userMessage);
        long startTime = System.currentTimeMillis();

        metrics.recordRequest();

        return chatClient.prompt()
            .user(userMessage)
            .stream()
            .chatResponse()
            .map(this::toAgentEvent)
            .filter(Objects::nonNull)
            .doOnComplete(() -> {
                metrics.recordDuration(System.currentTimeMillis() - startTime);
                log.debug("Stream completed - sessionId: {}", sessionId);
            })
            .doOnError(e -> {
                metrics.recordError();
                log.error("Stream error - sessionId: {}", sessionId, e);
            });
    }

    /**
     * 清除会话记忆 (空实现)
     *
     * @param sessionId 会话 ID
     */
    public void clearMemory(String sessionId) {
        log.info("Memory clear requested for session: {} (not implemented)", sessionId);
    }

    /**
     * 将 ChatResponse 转换为 AgentEvent
     */
    private AgentEvent toAgentEvent(ChatResponse response) {
        if (response.getResult() == null || response.getResult().getOutput() == null) {
            return null;
        }

        var result = response.getResult();
        var output = result.getOutput();

        // 处理文本内容
        String content = output.getText();
        if (content != null && !content.isEmpty()) {
            return new TextEvent(content);
        }

        // 处理完成事件
        var metadata = response.getMetadata();
        if (metadata != null) {
            var usage = metadata.getUsage();
            long inputTokens = usage != null ? usage.getPromptTokens() : 0;
            long outputTokens = usage != null ? usage.getCompletionTokens() : 0;

            return new CompleteEvent("stop", new Usage(inputTokens, outputTokens));
        }

        return null;
    }
}
