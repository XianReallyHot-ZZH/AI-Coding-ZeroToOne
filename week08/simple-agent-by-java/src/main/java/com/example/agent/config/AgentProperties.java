package com.example.agent.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Agent 配置属性
 */
@Component
@ConfigurationProperties(prefix = "agent")
public class AgentProperties {

    /**
     * 默认模型
     */
    private String defaultModel = "gpt-4o";

    /**
     * 系统提示词
     */
    private String systemPrompt = "You are a helpful AI assistant.";

    /**
     * 最大步数
     */
    private int maxSteps = 200;

    /**
     * 温度参数
     */
    private double temperature = 0.7;

    /**
     * 最大 Token 数
     */
    private int maxTokens = 4096;

    // Getters and Setters

    public String getDefaultModel() {
        return defaultModel;
    }

    public void setDefaultModel(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public void setSystemPrompt(String systemPrompt) {
        this.systemPrompt = systemPrompt;
    }

    public int getMaxSteps() {
        return maxSteps;
    }

    public void setMaxSteps(int maxSteps) {
        this.maxSteps = maxSteps;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens) {
        this.maxTokens = maxTokens;
    }
}
