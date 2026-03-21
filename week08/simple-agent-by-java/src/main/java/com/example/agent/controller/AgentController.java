package com.example.agent.controller;

import com.example.agent.service.AgentService;
import com.example.agent.types.AgentEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.UUID;

/**
 * Agent REST API 控制器
 */
@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    private static final Logger log = LoggerFactory.getLogger(AgentController.class);

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    /**
     * 同步对话接口
     *
     * @param sessionId 会话 ID (可选)
     * @param request   请求体
     * @return 响应内容
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody ChatRequest request) {

        String sid = sessionId != null ? sessionId : UUID.randomUUID().toString();
        log.info("Chat request - sessionId: {}, message length: {}", sid, request.message().length());

        String response = agentService.chat(sid, request.message());

        return ResponseEntity.ok()
            .header("X-Session-Id", sid)
            .body(new ChatResponse(response));
    }

    /**
     * 流式对话接口 (SSE)
     *
     * @param sessionId 会话 ID (可选)
     * @param request   请求体
     * @return SSE 事件流
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<AgentEvent>> streamChat(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody ChatRequest request) {

        String sid = sessionId != null ? sessionId : UUID.randomUUID().toString();
        log.info("Stream request - sessionId: {}, message length: {}", sid, request.message().length());

        return agentService.chatStream(sid, request.message())
            .map(event -> ServerSentEvent.<AgentEvent>builder()
                .id(UUID.randomUUID().toString())
                .event(event.getClass().getSimpleName())
                .data(event)
                .build());
    }

    /**
     * 获取可用工具列表
     *
     * @return 工具名称列表
     */
    @GetMapping("/tools")
    public ResponseEntity<ToolsResponse> getTools() {
        return ResponseEntity.ok(new ToolsResponse(agentService.getAvailableTools()));
    }

    /**
     * 健康检查
     *
     * @return 状态信息
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(new HealthResponse("ok", "Agent is running"));
    }

    // Request/Response records

    public record ChatRequest(String message) {}

    public record ChatResponse(String content) {}

    public record ToolsResponse(java.util.List<String> tools) {}

    public record HealthResponse(String status, String message) {}
}
