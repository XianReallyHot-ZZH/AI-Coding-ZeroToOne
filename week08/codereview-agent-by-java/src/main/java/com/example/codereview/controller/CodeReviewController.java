package com.example.codereview.controller;

import com.example.codereview.service.CodeReviewService;
import com.example.codereview.types.AgentEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

/**
 * 代码审查 REST API 控制器
 */
@RestController
@RequestMapping("/api/v1/review")
public class CodeReviewController {

    private static final Logger log = LoggerFactory.getLogger(CodeReviewController.class);

    private final CodeReviewService codeReviewService;

    public CodeReviewController(CodeReviewService codeReviewService) {
        this.codeReviewService = codeReviewService;
    }

    /**
     * 同步代码审查接口
     *
     * @param sessionId 会话 ID (可选)
     * @param request   请求体
     * @return 响应内容
     */
    @PostMapping
    public ResponseEntity<ReviewResponse> review(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody ReviewRequest request) {

        String sid = sessionId != null ? sessionId : UUID.randomUUID().toString();
        log.info("Review request - sessionId: {}, message length: {}", sid, request.message().length());

        String response = codeReviewService.review(sid, request.message());

        return ResponseEntity.ok()
            .header("X-Session-Id", sid)
            .body(new ReviewResponse(sid, response));
    }

    /**
     * 流式代码审查接口 (SSE)
     *
     * @param sessionId 会话 ID (可选)
     * @param request   请求体
     * @return SSE 事件流
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<AgentEvent>> streamReview(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody ReviewRequest request) {

        String sid = sessionId != null ? sessionId : UUID.randomUUID().toString();
        log.info("Stream review request - sessionId: {}, message length: {}", sid, request.message().length());

        return codeReviewService.reviewStream(sid, request.message())
            .map(event -> ServerSentEvent.<AgentEvent>builder()
                .id(UUID.randomUUID().toString())
                .event(event.getClass().getSimpleName())
                .data(event)
                .build());
    }

    /**
     * 清除会话记忆
     *
     * @param sessionId 会话 ID
     * @return 操作结果
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<ClearResponse> clearSession(@PathVariable String sessionId) {
        log.info("Clear session request - sessionId: {}", sessionId);
        codeReviewService.clearMemory(sessionId);
        return ResponseEntity.ok(new ClearResponse("Session cleared", sessionId));
    }

    /**
     * 获取可用工具列表
     *
     * @return 工具名称列表
     */
    @GetMapping("/tools")
    public ResponseEntity<ToolsResponse> getTools() {
        return ResponseEntity.ok(new ToolsResponse(codeReviewService.getAvailableTools()));
    }

    /**
     * 健康检查
     *
     * @return 状态信息
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(new HealthResponse("ok", "Code Review Agent is running"));
    }

    // Request/Response records

    public record ReviewRequest(String message) {}

    public record ReviewResponse(String sessionId, String content) {}

    public record ClearResponse(String message, String sessionId) {}

    public record ToolsResponse(List<String> tools) {}

    public record HealthResponse(String status, String message) {}
}
