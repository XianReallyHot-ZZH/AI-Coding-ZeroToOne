package com.example.codereview.cli;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.metrics.AgentMetrics;
import com.example.codereview.tool.CodeReviewTools;
import com.example.codereview.tool.GhOperations;
import com.example.codereview.tool.GitOperations;
import com.example.codereview.types.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Code Review CLI - 在当前目录运行代码审查
 *
 * 用法:
 *   codereview "review current branch"
 *   codereview "review uncommitted changes"
 *   codereview "review commit abc123"
 *   codereview                          # 交互模式
 */
@SpringBootApplication
@ComponentScan(basePackages = "com.example.codereview")
public class CodeReviewCli {

    private static final Logger log = LoggerFactory.getLogger(CodeReviewCli.class);

    public static void main(String[] args) {
        // 检查是否是 CLI 模式（有非 Spring 参数，或者无参数进入交互模式）
        boolean hasInteractiveFlag = false;
        boolean hasServerFlag = false;
        boolean hasNonSpringArgs = false;

        for (String arg : args) {
            if ("-i".equals(arg) || "--interactive".equals(arg)) {
                hasInteractiveFlag = true;
            } else if ("--server".equals(arg) || arg.startsWith("--server.port")) {
                hasServerFlag = true;
            } else if (!arg.startsWith("--")) {
                hasNonSpringArgs = true;
            }
        }

        // CLI 模式：有非 Spring 参数、有交互标志、或无参数
        boolean cliMode = hasNonSpringArgs || hasInteractiveFlag || args.length == 0;

        if (cliMode && !hasServerFlag) {
            // CLI 模式 - 禁用 Web 服务器
            new SpringApplicationBuilder(CodeReviewCli.class)
                .web(org.springframework.boot.WebApplicationType.NONE)
                .logStartupInfo(false)
                .run(args);
        } else {
            // Web 模式
            SpringApplication.run(CodeReviewCli.class, args);
        }
    }

    @Bean
    public CommandLineRunner cliRunner(
            ChatModel chatModel,
            CodeReviewProperties properties,
            AgentMetrics metrics) {

        return args -> {
            String userDir = System.getProperty("user.dir");
            properties.setWorkingDirectory(userDir);

            // 检查是否是交互模式 (-i 或 --interactive)
            boolean interactiveMode = System.getProperty("interactive") != null;
            for (String arg : args) {
                if ("-i".equals(arg) || "--interactive".equals(arg)) {
                    interactiveMode = true;
                    break;
                }
            }

            // 过滤掉 -i 和 --interactive 参数
            List<String> filteredArgs = new ArrayList<>();
            for (String arg : args) {
                if (!"-i".equals(arg) && !"--interactive".equals(arg) && !arg.startsWith("--")) {
                    filteredArgs.add(arg);
                }
            }

            // 交互模式：无参数或明确指定 -i/--interactive
            if (interactiveMode || filteredArgs.isEmpty()) {
                runInteractiveMode(chatModel, properties, metrics);
                System.exit(0);
            }
            // 单次审查模式
            else if (!filteredArgs.isEmpty()) {
                String userMessage = String.join(" ", filteredArgs);
                runCliReview(chatModel, properties, metrics, userMessage, userDir);
                System.exit(0);
            }
            // Web 模式由 Spring Boot 自动启动（有 --server 等参数）
        };
    }

    /**
     * 运行单次 CLI 审查
     */
    private void runCliReview(
            ChatModel chatModel,
            CodeReviewProperties properties,
            AgentMetrics metrics,
            String userMessage,
            String workingDir) throws IOException {

        log.info("Code Review CLI - Working directory: {}", workingDir);
        log.info("Review request: {}", userMessage);

        // 检查是否是 Git 仓库
        if (!Path.of(workingDir, ".git").toFile().exists()) {
            System.err.println("Error: Not a Git repository: " + workingDir);
            System.err.println("Please run this command in a Git repository directory.");
            System.exit(1);
        }

        // 加载系统提示词
        String systemPrompt = loadSystemPrompt(properties);

        // 创建工具
        List<ToolCallback> tools = createTools(properties);

        log.info("Available tools: {}", tools.stream()
            .map(t -> t.getToolDefinition().name()).toList());

        // 构建 ChatClient
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(tools)
            .build();

        // 执行审查
        long startTime = System.currentTimeMillis();
        metrics.recordRequest();

        try {
            System.out.println("\n" + "=".repeat(60));
            System.out.println("Code Review Result");
            System.out.println("=".repeat(60) + "\n");

            String response = chatClient.prompt()
                .user(userMessage)
                .call()
                .content();

            System.out.println(response);

            System.out.println("\n" + "=".repeat(60));
            long duration = System.currentTimeMillis() - startTime;
            System.out.printf("Completed in %.1f seconds%n", duration / 1000.0);
            System.out.println("=".repeat(60));

            metrics.recordDuration(duration);

        } catch (Exception e) {
            metrics.recordError();
            System.err.println("Error: " + e.getMessage());
            log.error("Review failed", e);
            System.exit(1);
        }
    }

    /**
     * 运行交互模式
     */
    private void runInteractiveMode(
            ChatModel chatModel,
            CodeReviewProperties properties,
            AgentMetrics metrics) throws IOException {

        String workingDir = System.getProperty("user.dir");
        properties.setWorkingDirectory(workingDir);

        log.info("Interactive mode - Working directory: {}", workingDir);

        // 加载系统提示词
        String systemPrompt = loadSystemPrompt(properties);

        // 创建工具
        List<ToolCallback> tools = createTools(properties);

        // 构建 ChatClient
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(tools)
            .build();

        System.out.println("\n" + "=".repeat(60));
        System.out.println("Code Review Agent - Interactive Mode");
        System.out.println("Working directory: " + workingDir);
        System.out.println("Type 'exit' or 'quit' to exit");
        System.out.println("=".repeat(60) + "\n");

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

        while (true) {
            System.out.print("\n> ");
            String input = reader.readLine();

            if (input == null || input.isBlank()) {
                continue;
            }

            if ("exit".equalsIgnoreCase(input.trim()) || "quit".equalsIgnoreCase(input.trim())) {
                System.out.println("Goodbye!");
                break;
            }

            try {
                long startTime = System.currentTimeMillis();
                metrics.recordRequest();

                String response = chatClient.prompt()
                    .user(input)
                    .call()
                    .content();

                System.out.println("\n" + response);

                metrics.recordDuration(System.currentTimeMillis() - startTime);

            } catch (Exception e) {
                metrics.recordError();
                System.err.println("Error: " + e.getMessage());
            }
        }

        System.exit(0);
    }

    /**
     * 加载系统提示词
     */
    private String loadSystemPrompt(CodeReviewProperties properties) throws IOException {
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

        return promptPath;
    }

    /**
     * 默认系统提示词
     */
    private String getDefaultSystemPrompt() {
        return """
            You are a code review agent. Review code changes and provide actionable feedback.

            Use the available tools to:
            1. Get diffs with gitCommand
            2. Read files for context with readFile
            3. Write review reports with writeFile

            Provide structured feedback with severity levels (Critical/High/Medium/Low).
            """;
    }

    /**
     * 创建工具
     */
    private List<ToolCallback> createTools(CodeReviewProperties properties) {
        GitOperations gitOps = new GitOperations(properties);
        GhOperations ghOps = new GhOperations(properties);
        CodeReviewTools fileTools = new CodeReviewTools(properties);

        Function<GitCommandRequest, String> gitCommand = req -> gitOps.execute(req.operation(), req.params());
        Function<GhCommandRequest, String> ghCommand = req -> ghOps.execute(req.operation(), req.params());
        Function<ReadFileRequest, String> readFile = req -> fileTools.readFile(req.path());
        Function<WriteFileRequest, String> writeFile = req -> fileTools.writeFile(req.path(), req.content());

        return List.of(
            FunctionToolCallback.builder("gitCommand", gitCommand)
                .description("Execute Git commands to get code changes")
                .inputType(GitCommandRequest.class)
                .build(),
            FunctionToolCallback.builder("ghCommand", ghCommand)
                .description("Execute GitHub CLI commands for PR information")
                .inputType(GhCommandRequest.class)
                .build(),
            FunctionToolCallback.builder("readFile", readFile)
                .description("Read file content for context")
                .inputType(ReadFileRequest.class)
                .build(),
            FunctionToolCallback.builder("writeFile", writeFile)
                .description("Write review report to file")
                .inputType(WriteFileRequest.class)
                .build()
        );
    }

    // Request records
    public record ReadFileRequest(String path) {}
    public record WriteFileRequest(String path, String content) {}
}
