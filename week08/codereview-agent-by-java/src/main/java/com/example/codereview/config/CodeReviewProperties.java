package com.example.codereview.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Code Review Agent 配置属性
 */
@Component
@ConfigurationProperties(prefix = "codereview")
public class CodeReviewProperties {

    /**
     * 默认模型
     */
    private String defaultModel = "deepseek-reasoner";

    /**
     * 系统提示词路径 (classpath 路径)
     */
    private String systemPromptPath = "classpath:prompts/system.md";

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

    /**
     * 工作目录
     */
    private String workingDirectory = System.getProperty("user.dir");

    /**
     * 最大文件大小 (bytes)
     */
    private long maxFileSize = 10 * 1024 * 1024; // 10MB

    /**
     * Git 配置
     */
    private GitConfig git = new GitConfig();

    /**
     * GitHub CLI 配置
     */
    private GhConfig gh = new GhConfig();

    /**
     * Git 配置
     */
    public static class GitConfig {
        private int timeoutSeconds = 30;
        private long maxOutputBytes = 1048576; // 1MB

        public int getTimeoutSeconds() {
            return timeoutSeconds;
        }

        public void setTimeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }

        public long getMaxOutputBytes() {
            return maxOutputBytes;
        }

        public void setMaxOutputBytes(long maxOutputBytes) {
            this.maxOutputBytes = maxOutputBytes;
        }
    }

    /**
     * GitHub CLI 配置
     */
    public static class GhConfig {
        private int timeoutSeconds = 30;

        public int getTimeoutSeconds() {
            return timeoutSeconds;
        }

        public void setTimeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }
    }

    // Getters and Setters

    public String getDefaultModel() {
        return defaultModel;
    }

    public void setDefaultModel(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public String getSystemPromptPath() {
        return systemPromptPath;
    }

    public void setSystemPromptPath(String systemPromptPath) {
        this.systemPromptPath = systemPromptPath;
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

    public String getWorkingDirectory() {
        return workingDirectory;
    }

    public void setWorkingDirectory(String workingDirectory) {
        this.workingDirectory = workingDirectory;
    }

    public long getMaxFileSize() {
        return maxFileSize;
    }

    public void setMaxFileSize(long maxFileSize) {
        this.maxFileSize = maxFileSize;
    }

    public GitConfig getGit() {
        return git;
    }

    public void setGit(GitConfig git) {
        this.git = git;
    }

    public GhConfig getGh() {
        return gh;
    }

    public void setGh(GhConfig gh) {
        this.gh = gh;
    }
}
