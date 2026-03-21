package com.example.agent.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Agent 指标收集
 */
@Component
public class AgentMetrics {

    private final Counter requestCounter;
    private final Counter errorCounter;
    private final Timer requestTimer;
    private final Counter toolCallCounter;

    public AgentMetrics(MeterRegistry meterRegistry) {
        // 请求计数器
        this.requestCounter = Counter.builder("agent.requests.total")
            .description("Total agent requests")
            .register(meterRegistry);

        // 错误计数器
        this.errorCounter = Counter.builder("agent.errors.total")
            .description("Total agent errors")
            .register(meterRegistry);

        // 请求计时器
        this.requestTimer = Timer.builder("agent.requests.duration")
            .description("Agent request duration")
            .register(meterRegistry);

        // 工具调用计数器
        this.toolCallCounter = Counter.builder("agent.tool.calls.total")
            .description("Total tool calls")
            .register(meterRegistry);
    }

    /**
     * 记录请求
     */
    public void recordRequest() {
        requestCounter.increment();
    }

    /**
     * 记录错误
     */
    public void recordError() {
        errorCounter.increment();
    }

    /**
     * 记录请求耗时
     */
    public void recordDuration(long durationMs) {
        requestTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }

    /**
     * 记录工具调用
     */
    public void recordToolCall(String toolName) {
        toolCallCounter.increment();
    }
}
