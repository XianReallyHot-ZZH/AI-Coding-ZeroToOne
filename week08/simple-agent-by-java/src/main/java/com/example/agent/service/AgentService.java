package com.example.agent.service;

import com.example.agent.config.AgentProperties;
import com.example.agent.types.AgentEvent;
import com.example.agent.types.CompleteEvent;
import com.example.agent.types.TextEvent;
import com.example.agent.types.Usage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Objects;

/**
 * Agent 服务 - 核心业务逻辑
 */
@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final ChatClient chatClient;
    private final AgentProperties properties;

    public AgentService(ChatModel chatModel, AgentProperties properties) {
        this.properties = properties;

        // 构建 ChatClient
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem(properties.getSystemPrompt())
            .build();

        log.info("AgentService initialized with model: {}", properties.getDefaultModel());
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

        String response = chatClient.prompt()
            .user(userMessage)
            .call()
            .content();

        log.debug("Chat response - sessionId: {}, length: {}", sessionId,
            response != null ? response.length() : 0);

        return response;
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

        return chatClient.prompt()
            .user(userMessage)
            .stream()
            .chatResponse()
            .map(this::toAgentEvent)
            .filter(Objects::nonNull)
            .doOnComplete(() -> log.debug("Stream completed - sessionId: {}", sessionId))
            .doOnError(e -> log.error("Stream error - sessionId: {}", sessionId, e));
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

        // 处理文本内容 - 使用 getContent() 而不是 getText()
        String content = output.getContent();
        if (content != null && !content.isEmpty()) {
            return new TextEvent(content);
        }

        // 处理完成事件
        var metadata = response.getMetadata();
        if (metadata != null) {
            var usage = metadata.getUsage();
            long inputTokens = usage != null ? usage.getPromptTokens() : 0;
            long outputTokens = usage != null ? usage.getGenerationTokens() : 0;

            // 从 GenerateChatResponse 获取 finishReason
            return new CompleteEvent("stop", new Usage(inputTokens, outputTokens));
        }

        return null;
    }
}
