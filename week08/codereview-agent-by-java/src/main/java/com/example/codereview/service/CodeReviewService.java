package com.example.codereview.service;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.metrics.AgentMetrics;
import com.example.codereview.types.AgentEvent;
import com.example.codereview.types.CompleteEvent;
import com.example.codereview.types.TextEvent;
import com.example.codereview.types.Usage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * 代码审查服务 - 核心业务逻辑
 */
@Service
public class CodeReviewService {

    private static final Logger log = LoggerFactory.getLogger(CodeReviewService.class);

    private final ChatClient chatClient;
    private final ChatModel chatModel;
    private final CodeReviewProperties properties;
    private final List<ToolCallback> allTools;
    private final AgentMetrics metrics;
    private final String systemPrompt;

    public CodeReviewService(
            ChatModel chatModel,
            CodeReviewProperties properties,
            ToolCallbackProvider codeReviewToolCallbackProvider,
            AgentMetrics metrics) throws IOException {

        this.chatModel = chatModel;
        this.properties = properties;
        this.metrics = metrics;

        // 获取工具
        this.allTools = new ArrayList<>(Arrays.asList(codeReviewToolCallbackProvider.getToolCallbacks()));

        log.info("Total tools available: {} - {}", allTools.size(),
            allTools.stream().map(ToolCallback::getToolDefinition).map(d -> d.name()).toList());

        // 加载系统提示词
        this.systemPrompt = loadSystemPrompt();
        log.info("System prompt loaded, length: {} characters", systemPrompt.length());

        // 构建 ChatClient
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(allTools)
            .build();

        log.info("CodeReviewService initialized with model: {}", properties.getDefaultModel());
    }

    /**
     * 从 classpath 加载系统提示词
     */
    private String loadSystemPrompt() throws IOException {
        String promptPath = properties.getSystemPromptPath();

        if (promptPath.startsWith("classpath:")) {
            String resourcePath = promptPath.substring("classpath:".length());
            ClassPathResource resource = new ClassPathResource(resourcePath);

            if (!resource.exists()) {
                log.warn("System prompt file not found: {}, using default", promptPath);
                return getDefaultSystemPrompt();
            }

            return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        }

        // 如果不是 classpath 路径，直接使用作为提示词
        return promptPath;
    }

    /**
     * 默认系统提示词
     */
    private String getDefaultSystemPrompt() {
        return """
            You are a code review agent. Your primary purpose is to review code changes and provide actionable, precise feedback.

            ## Available Tools
            - gitCommand: Execute Git commands to get code changes
            - ghCommand: Execute GitHub CLI commands for PR information
            - readFile: Read file contents for context
            - writeFile: Write review reports

            ## Review Workflow
            1. Determine what to review based on user input
            2. Use gitCommand to get diffs and changes
            3. Use readFile to get full context of modified files
            4. Provide structured feedback with severity levels

            ## Output Format
            Use Markdown with sections for Summary, Issues Found (by severity), Suggestions, and Verification steps.
            """;
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
     * 同步代码审查
     *
     * @param sessionId   会话 ID
     * @param userMessage 用户消息
     * @return 响应内容
     */
    public String review(String sessionId, String userMessage) {
        log.debug("Review request - sessionId: {}, message: {}", sessionId, userMessage);
        long startTime = System.currentTimeMillis();

        try {
            metrics.recordRequest();

            String response = chatClient.prompt()
                .user(userMessage)
                .call()
                .content();

            metrics.recordDuration(System.currentTimeMillis() - startTime);
            log.debug("Review response - sessionId: {}, length: {}", sessionId,
                response != null ? response.length() : 0);

            return response;

        } catch (Exception e) {
            metrics.recordError();
            throw e;
        }
    }

    /**
     * 流式代码审查
     *
     * @param sessionId   会话 ID
     * @param userMessage 用户消息
     * @return 事件流
     */
    public Flux<AgentEvent> reviewStream(String sessionId, String userMessage) {
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
     * 清除会话记忆
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

    /**
     * 获取系统提示词
     */
    public String getSystemPrompt() {
        return systemPrompt;
    }
}
