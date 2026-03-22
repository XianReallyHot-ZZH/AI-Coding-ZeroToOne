package com.example.codereview.cli;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.metrics.AgentMetrics;
import com.example.codereview.tool.CodeReviewTools;
import com.example.codereview.tool.GhOperations;
import com.example.codereview.tool.GitOperations;
import com.example.codereview.types.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
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

    // ANSI 颜色代码
    private static final String RESET = "\u001B[0m";
    private static final String BOLD = "\u001B[1m";
    private static final String GRAY = "\u001B[90m";
    private static final String GREEN = "\u001B[32m";
    private static final String YELLOW = "\u001B[33m";
    private static final String BLUE = "\u001B[34m";
    private static final String CYAN = "\u001B[36m";
    private static final String RED = "\u001B[31m";

    // 状态追踪
    private final AtomicBoolean isFirstChunk = new AtomicBoolean(true);
    private final AtomicBoolean isThinking = new AtomicBoolean(false);
    private final AtomicInteger toolCallCount = new AtomicInteger(0);
    private final AtomicBoolean hasOutputHeader = new AtomicBoolean(false);

    public static void main(String[] args) {
        // 检查是否是 CLI 模式
        boolean hasInteractiveFlag = false;
        boolean hasServerFlag = false;
        boolean hasNonSpringArgs = false;
        boolean verbose = false;

        for (String arg : args) {
            if ("-i".equals(arg) || "--interactive".equals(arg)) {
                hasInteractiveFlag = true;
            } else if ("-v".equals(arg) || "--verbose".equals(arg)) {
                verbose = true;
            } else if ("--server".equals(arg) || arg.startsWith("--server.port")) {
                hasServerFlag = true;
            } else if (!arg.startsWith("--")) {
                hasNonSpringArgs = true;
            }
        }

        boolean cliMode = hasNonSpringArgs || hasInteractiveFlag || args.length == 0;

        if (cliMode && !hasServerFlag) {
            System.setProperty("spring.main.banner-mode", "off");
            System.setProperty("logging.level.root", verbose ? "INFO" : "OFF");
            System.setProperty("logging.level.com.example.codereview", verbose ? "DEBUG" : "OFF");
            System.setProperty("logging.level.org.springframework.ai", verbose ? "DEBUG" : "OFF");
            System.setProperty("logging.level.org.springframework", verbose ? "INFO" : "OFF");

            new SpringApplicationBuilder(CodeReviewCli.class)
                .web(org.springframework.boot.WebApplicationType.NONE)
                .logStartupInfo(false)
                .run(args);
        } else {
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

            boolean interactiveMode = false;
            for (String arg : args) {
                if ("-i".equals(arg) || "--interactive".equals(arg)) {
                    interactiveMode = true;
                    break;
                }
            }

            List<String> filteredArgs = new ArrayList<>();
            for (String arg : args) {
                if (!"-i".equals(arg) && !"--interactive".equals(arg)
                    && !"-v".equals(arg) && !"--verbose".equals(arg)
                    && !arg.startsWith("--")) {
                    filteredArgs.add(arg);
                }
            }

            if (interactiveMode || filteredArgs.isEmpty()) {
                runInteractiveMode(chatModel, properties, metrics);
                System.exit(0);
            } else if (!filteredArgs.isEmpty()) {
                String userMessage = String.join(" ", filteredArgs);
                runCliReview(chatModel, properties, metrics, userMessage, userDir);
                System.exit(0);
            }
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

        if (!Path.of(workingDir, ".git").toFile().exists()) {
            System.err.println(RED + "Error: Not a Git repository: " + workingDir + RESET);
            System.exit(1);
        }

        String systemPrompt = loadSystemPrompt(properties);
        List<ToolCallback> tools = createToolsWithFeedback(properties);

        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(tools)
            .build();

        // 重置状态
        isFirstChunk.set(true);
        isThinking.set(false);
        toolCallCount.set(0);
        hasOutputHeader.set(false);

        System.out.println();
        System.out.println(GREEN + BOLD + "Working directory:" + RESET + " " + workingDir);
        System.out.println(GREEN + BOLD + "Review request:" + RESET + " " + userMessage);
        System.out.println();

        // 显示思考状态
        System.out.print(YELLOW + "🤔 Analyzing your request..." + RESET);
        System.out.flush();

        long startTime = System.currentTimeMillis();
        metrics.recordRequest();

        try {
            StringBuilder fullResponse = new StringBuilder();

            chatClient.prompt()
                .user(userMessage)
                .stream()
                .chatResponse()
                .doOnNext(response -> {
                    processStreamResponse(response, fullResponse, true);
                })
                .doOnComplete(() -> {
                    if (fullResponse.length() == 0 && toolCallCount.get() == 0) {
                        System.out.print("\r" + " ".repeat(40) + "\r");
                        System.out.println(GRAY + "No response generated." + RESET);
                    }
                })
                .blockLast();

            System.out.println();
            System.out.println();
            System.out.println(GRAY + "─".repeat(50) + RESET);
            long duration = System.currentTimeMillis() - startTime;
            System.out.printf(GRAY + "✅ Completed in %.1f seconds", duration / 1000.0);
            if (toolCallCount.get() > 0) {
                System.out.printf(" (%d tool calls)", toolCallCount.get());
            }
            System.out.println(RESET);

            metrics.recordDuration(duration);

        } catch (Exception e) {
            metrics.recordError();
            System.out.print("\r" + " ".repeat(50) + "\r");
            System.err.println(RED + "❌ Error: " + e.getMessage() + RESET);
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

        String systemPrompt = loadSystemPrompt(properties);
        List<ToolCallback> tools = createToolsWithFeedback(properties);

        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(tools)
            .build();

        System.out.println();
        System.out.println(GREEN + "═".repeat(55) + RESET);
        System.out.println(GREEN + BOLD + "  Code Review Agent - Interactive Mode" + RESET);
        System.out.println(GREEN + "═".repeat(55) + RESET);
        System.out.println();
        System.out.println(GRAY + "  📁 Working directory: " + workingDir + RESET);
        System.out.println(GRAY + "  🤖 Model: " + properties.getDefaultModel() + RESET);
        System.out.println(GRAY + "  💬 Type 'exit' or 'quit' to exit" + RESET);
        System.out.println(GRAY + "  ❓ Type 'help' for available commands" + RESET);
        System.out.println();

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

        while (true) {
            System.out.print(CYAN + BOLD + "> " + RESET);
            String input = reader.readLine();

            if (input == null || input.isBlank()) {
                continue;
            }

            String trimmedInput = input.trim();

            if ("exit".equalsIgnoreCase(trimmedInput) || "quit".equalsIgnoreCase(trimmedInput)) {
                System.out.println(GREEN + "👋 Goodbye!" + RESET);
                break;
            }

            if ("help".equalsIgnoreCase(trimmedInput)) {
                printHelp();
                continue;
            }

            if ("status".equalsIgnoreCase(trimmedInput)) {
                printStatus(workingDir, properties.getDefaultModel());
                continue;
            }

            // 重置状态
            isFirstChunk.set(true);
            isThinking.set(false);
            toolCallCount.set(0);
            hasOutputHeader.set(false);

            // 显示思考状态
            System.out.print(YELLOW + "🤔 Thinking..." + RESET);
            System.out.flush();

            try {
                long startTime = System.currentTimeMillis();
                metrics.recordRequest();

                StringBuilder fullResponse = new StringBuilder();

                chatClient.prompt()
                    .user(input)
                    .stream()
                    .chatResponse()
                    .doOnNext(response -> {
                        processStreamResponse(response, fullResponse, false);
                    })
                    .blockLast();

                System.out.println();
                metrics.recordDuration(System.currentTimeMillis() - startTime);

            } catch (Exception e) {
                metrics.recordError();
                System.out.print("\r" + " ".repeat(50) + "\r");
                System.err.println(RED + "❌ Error: " + e.getMessage() + RESET);
            }
        }

        System.exit(0);
    }

    /**
     * 处理流式响应
     */
    private void processStreamResponse(ChatResponse response, StringBuilder fullResponse, boolean showHeader) {
        if (response.getResult() == null || response.getResult().getOutput() == null) {
            return;
        }

        var output = response.getResult().getOutput();

        // 处理工具调用
        var toolCalls = output.getToolCalls();
        if (toolCalls != null && !toolCalls.isEmpty()) {
            for (var toolCall : toolCalls) {
                String toolName = toolCall.name();
                String toolArgs = formatToolArgs(toolCall.arguments());

                // 清除思考状态，显示工具调用
                System.out.print("\r" + " ".repeat(50) + "\r");
                System.out.print(BLUE + "🔧 " + RESET + toolName);
                if (!toolArgs.isEmpty()) {
                    System.out.print(GRAY + " (" + toolArgs + ")" + RESET);
                }
                System.out.println();

                toolCallCount.incrementAndGet();
                isFirstChunk.set(false);
            }
            return;
        }

        // 处理文本内容
        String text = output.getText();
        if (text != null && !text.isEmpty()) {
            // 首次输出正文时，清除思考状态并显示标题
            if (hasOutputHeader.compareAndSet(false, true)) {
                System.out.print("\r" + " ".repeat(50) + "\r");
                if (showHeader) {
                    System.out.println(GREEN + BOLD + "📝 Review Result:" + RESET);
                    System.out.println(GRAY + "─".repeat(50) + RESET);
                } else {
                    System.out.println();
                }
            }

            System.out.print(text);
            fullResponse.append(text);
            isFirstChunk.set(false);
        }
    }

    /**
     * 格式化工具参数
     */
    private String formatToolArgs(String args) {
        if (args == null || args.isEmpty()) {
            return "";
        }
        if (args.length() > 60) {
            return args.substring(0, 57) + "...";
        }
        return args.replace("\n", " ").replaceAll("\\s+", " ");
    }

    /**
     * 创建带反馈的工具
     */
    private List<ToolCallback> createToolsWithFeedback(CodeReviewProperties properties) {
        GitOperations gitOps = new GitOperations(properties);
        GhOperations ghOps = new GhOperations(properties);
        CodeReviewTools fileTools = new CodeReviewTools(properties);

        return List.of(
            createToolCallback("gitCommand", "Execute Git commands to get code changes",
                GitCommandRequest.class, req -> {
                    printToolExecution("gitCommand", req.operation().name());
                    return gitOps.execute(req.operation(), req.params());
                }),
            createToolCallback("ghCommand", "Execute GitHub CLI commands for PR information",
                GhCommandRequest.class, req -> {
                    printToolExecution("ghCommand", req.operation().name());
                    return ghOps.execute(req.operation(), req.params());
                }),
            createToolCallback("readFile", "Read file content for context",
                ReadFileRequest.class, req -> {
                    printToolExecution("readFile", req.path());
                    return fileTools.readFile(req.path());
                }),
            createToolCallback("writeFile", "Write review report to file",
                WriteFileRequest.class, req -> {
                    printToolExecution("writeFile", req.path());
                    return fileTools.writeFile(req.path(), req.content());
                })
        );
    }

    /**
     * 打印工具执行状态
     */
    private void printToolExecution(String toolName, String detail) {
        System.out.print("\r" + " ".repeat(50) + "\r");
        System.out.print(BLUE + "⏳ " + RESET + toolName + GRAY + " - " + detail + RESET);
        System.out.flush();
    }

    /**
     * 创建工具回调
     */
    private <T> ToolCallback createToolCallback(String name, String description,
            Class<T> inputType, Function<T, String> function) {
        return FunctionToolCallback.builder(name, function)
            .description(description)
            .inputType(inputType)
            .build();
    }

    /**
     * 打印帮助信息
     */
    private void printHelp() {
        System.out.println();
        System.out.println(GREEN + BOLD + "Available Commands:" + RESET);
        System.out.println();
        System.out.println(GRAY + "  review current branch  - Review changes in current branch vs main" + RESET);
        System.out.println(GRAY + "  review uncommitted     - Review uncommitted (staged + unstaged)" + RESET);
        System.out.println(GRAY + "  review last commit     - Review the most recent commit" + RESET);
        System.out.println(GRAY + "  review commit <hash>   - Review specific commit" + RESET);
        System.out.println(GRAY + "  review PR <number>     - Review pull request (needs gh CLI)" + RESET);
        System.out.println();
        System.out.println(GRAY + "  status                 - Show repository status" + RESET);
        System.out.println(GRAY + "  help                   - Show this help" + RESET);
        System.out.println(GRAY + "  exit / quit            - Exit interactive mode" + RESET);
        System.out.println();
    }

    /**
     * 打印状态
     */
    private void printStatus(String workingDir, String model) {
        System.out.println();
        System.out.println(GREEN + BOLD + "📊 Repository Status:" + RESET);
        System.out.println(GRAY + "  📁 Directory: " + workingDir + RESET);
        System.out.println(GRAY + "  🤖 Model: " + model + RESET);

        boolean isGitRepo = Path.of(workingDir, ".git").toFile().exists();
        System.out.println(GRAY + "  📦 Git repo: " + (isGitRepo ? "✅ Yes" : "❌ No") + RESET);
        System.out.println();
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

    // Request records
    public record ReadFileRequest(String path) {}
    public record WriteFileRequest(String path, String content) {}
}
