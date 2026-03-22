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
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
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
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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
    private static final String GRAY = "\u001B[90m";
    private static final String GREEN = "\u001B[32m";
    private static final String YELLOW = "\u001B[33m";
    private static final String BLUE = "\u001B[34m";
    private static final String CYAN = "\u001B[36m";

    public static void main(String[] args) {
        // 检查是否是 CLI 模式（有非 Spring 参数，或者无参数进入交互模式）
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

        // CLI 模式：有非 Spring 参数、有交互标志、或无参数
        boolean cliMode = hasNonSpringArgs || hasInteractiveFlag || args.length == 0;

        if (cliMode && !hasServerFlag) {
            // CLI 模式 - 禁用 Web 服务器，设置日志级别
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

            // 过滤参数
            List<String> filteredArgs = new ArrayList<>();
            for (String arg : args) {
                if (!"-i".equals(arg) && !"--interactive".equals(arg)
                    && !"-v".equals(arg) && !"--verbose".equals(arg)
                    && !arg.startsWith("--")) {
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

        // 检查是否是 Git 仓库
        if (!Path.of(workingDir, ".git").toFile().exists()) {
            System.err.println(RED + "Error: Not a Git repository: " + workingDir + RESET);
            System.err.println("Please run this command in a Git repository directory.");
            System.exit(1);
        }

        // 加载系统提示词和创建工具
        String systemPrompt = loadSystemPrompt(properties);
        List<ToolCallback> tools = createTools(properties);

        // 构建 ChatClient
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(tools)
            .build();

        System.out.println();
        System.out.println(GREEN + "Working directory:" + RESET + " " + workingDir);
        System.out.println(GREEN + "Review request:" + RESET + " " + userMessage);
        System.out.println();

        // 执行审查 - 使用流式输出
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
                .blockLast();

            System.out.println();
            System.out.println();
            System.out.println(GRAY + "─".repeat(50) + RESET);
            long duration = System.currentTimeMillis() - startTime;
            System.out.printf(GRAY + "Completed in %.1f seconds" + RESET + "%n", duration / 1000.0);

            metrics.recordDuration(duration);

        } catch (Exception e) {
            metrics.recordError();
            System.err.println(RED + "Error: " + e.getMessage() + RESET);
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

        // 加载系统提示词和创建工具
        String systemPrompt = loadSystemPrompt(properties);
        List<ToolCallback> tools = createTools(properties);

        // 构建 ChatClient
        ChatClient chatClient = ChatClient.builder(chatModel)
            .defaultSystem(systemPrompt)
            .defaultToolCallbacks(tools)
            .build();

        System.out.println();
        System.out.println(GREEN + "═".repeat(50) + RESET);
        System.out.println(GREEN + "  Code Review Agent - Interactive Mode" + RESET);
        System.out.println(GREEN + "═".repeat(50) + RESET);
        System.out.println();
        System.out.println(GRAY + "  Working directory: " + workingDir + RESET);
        System.out.println(GRAY + "  Type 'exit' or 'quit' to exit" + RESET);
        System.out.println(GRAY + "  Type 'help' for available commands" + RESET);
        System.out.println();

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

        while (true) {
            System.out.print(CYAN + "> " + RESET);
            String input = reader.readLine();

            if (input == null || input.isBlank()) {
                continue;
            }

            String trimmedInput = input.trim();

            if ("exit".equalsIgnoreCase(trimmedInput) || "quit".equalsIgnoreCase(trimmedInput)) {
                System.out.println(GREEN + "Goodbye!" + RESET);
                break;
            }

            if ("help".equalsIgnoreCase(trimmedInput)) {
                printHelp();
                continue;
            }

            if ("status".equalsIgnoreCase(trimmedInput)) {
                printStatus(workingDir);
                continue;
            }

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
                System.err.println(RED + "Error: " + e.getMessage() + RESET);
            }
        }

        System.exit(0);
    }

    /**
     * 处理流式响应
     */
    private void processStreamResponse(ChatResponse response, StringBuilder fullResponse, boolean showThinking) {
        if (response.getResult() == null || response.getResult().getOutput() == null) {
            return;
        }

        var output = response.getResult().getOutput();

        // 处理思考过程 (reasoning) - 如果模型支持
        String reasoning = extractReasoning(output);
        if (reasoning != null && !reasoning.isEmpty() && showThinking) {
            // 首次显示思考过程标题
            if (fullResponse.length() == 0) {
                System.out.println(YELLOW + "💭 Thinking..." + RESET);
                System.out.println(GRAY + "─".repeat(40) + RESET);
            }
            System.out.print(GRAY + reasoning + RESET);
        }

        // 处理文本内容
        String text = output.getText();
        if (text != null && !text.isEmpty()) {
            // 如果之前有思考过程，现在开始输出正文
            if (showThinking && fullResponse.length() == 0 && text.length() > 0) {
                System.out.println();
                System.out.println(GREEN + "📝 Review Result:" + RESET);
                System.out.println(GRAY + "─".repeat(40) + RESET);
            }
            System.out.print(text);
            fullResponse.append(text);
        }

        // 处理工具调用
        var toolCalls = output.getToolCalls();
        if (toolCalls != null && !toolCalls.isEmpty()) {
            for (var toolCall : toolCalls) {
                String toolName = toolCall.name();
                String toolArgs = formatToolArgs(toolCall.arguments());
                System.out.println(BLUE + "🔧 " + toolName + RESET + GRAY + "(" + toolArgs + ")" + RESET);
            }
        }
    }

    /**
     * 提取思考过程 (针对支持 reasoning 的模型)
     */
    private String extractReasoning(Object output) {
        try {
            // 尝试通过反射获取 reasoning 内容
            var method = output.getClass().getMethod("getReasoningContent");
            Object reasoning = method.invoke(output);
            return reasoning != null ? reasoning.toString() : null;
        } catch (Exception e) {
            // 不支持 reasoning 的模型，返回 null
            return null;
        }
    }

    /**
     * 格式化工具参数
     */
    private String formatToolArgs(String args) {
        if (args == null || args.length() > 50) {
            return "...";
        }
        return args.replace("\n", " ").replace("\"", "");
    }

    /**
     * 打印帮助信息
     */
    private void printHelp() {
        System.out.println();
        System.out.println(GREEN + "Available Commands:" + RESET);
        System.out.println(GRAY + "  review current branch  - Review changes in current branch" + RESET);
        System.out.println(GRAY + "  review uncommitted     - Review uncommitted changes" + RESET);
        System.out.println(GRAY + "  review commit <hash>   - Review specific commit" + RESET);
        System.out.println(GRAY + "  review PR <number>     - Review pull request" + RESET);
        System.out.println(GRAY + "  status                 - Show git status" + RESET);
        System.out.println(GRAY + "  help                   - Show this help" + RESET);
        System.out.println(GRAY + "  exit / quit            - Exit interactive mode" + RESET);
        System.out.println();
    }

    /**
     * 打印状态
     */
    private void printStatus(String workingDir) {
        System.out.println();
        System.out.println(GREEN + "Repository Status:" + RESET);
        System.out.println(GRAY + "  Directory: " + workingDir + RESET);

        boolean isGitRepo = Path.of(workingDir, ".git").toFile().exists();
        System.out.println(GRAY + "  Git repo: " + (isGitRepo ? "Yes" : "No") + RESET);
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

    private static final String RED = "\u001B[31m";

    // Request records
    public record ReadFileRequest(String path) {}
    public record WriteFileRequest(String path, String content) {}
}
