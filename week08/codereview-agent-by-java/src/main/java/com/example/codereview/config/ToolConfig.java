package com.example.codereview.config;

import com.example.codereview.tool.CodeReviewTools;
import com.example.codereview.tool.GhOperations;
import com.example.codereview.tool.GitOperations;
import com.example.codereview.types.GhCommandRequest;
import com.example.codereview.types.GitCommandRequest;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;
import org.springframework.context.annotation.Primary;

import java.util.List;
import java.util.function.Function;

/**
 * 工具配置类 - 定义代码审查工具
 */
@Configuration
public class ToolConfig {

    // ===== 函数式工具定义 (Spring AI 自动发现) =====

    @Bean
    @Description("Execute Git commands to get code changes. Supports diff, show, log, status operations.")
    public Function<GitCommandRequest, String> gitCommand(GitOperations gitOperations) {
        return request -> gitOperations.execute(request.operation(), request.params());
    }

    @Bean
    @Description("Execute GitHub CLI commands to get Pull Request information. Requires 'gh' CLI to be installed.")
    public Function<GhCommandRequest, String> ghCommand(GhOperations ghOperations) {
        return request -> ghOperations.execute(request.operation(), request.params());
    }

    @Bean
    @Description("Read the content of a file from the filesystem. Path must be relative to working directory.")
    public Function<ReadFileRequest, String> readFile(CodeReviewTools tools) {
        return request -> tools.readFile(request.path());
    }

    @Bean
    @Description("Write content to a file, creating parent directories if needed. Use this to create review reports.")
    public Function<WriteFileRequest, String> writeFile(CodeReviewTools tools) {
        return request -> tools.writeFile(request.path(), request.content());
    }

    // ===== 工具回调提供者 =====

    @Bean
    @Primary
    public ToolCallbackProvider codeReviewToolCallbackProvider(
            Function<GitCommandRequest, String> gitCommand,
            Function<GhCommandRequest, String> ghCommand,
            Function<ReadFileRequest, String> readFile,
            Function<WriteFileRequest, String> writeFile) {

        List<ToolCallback> callbacks = List.of(
            FunctionToolCallback.builder("gitCommand", gitCommand)
                .description("Execute Git commands to get code changes. Use this for viewing diffs, commits, logs, and status.")
                .inputType(GitCommandRequest.class)
                .build(),
            FunctionToolCallback.builder("ghCommand", ghCommand)
                .description("Execute GitHub CLI commands to get Pull Request information. Use this for reviewing PRs.")
                .inputType(GhCommandRequest.class)
                .build(),
            FunctionToolCallback.builder("readFile", readFile)
                .description("Read the content of a file. Use this to get full context of modified files.")
                .inputType(ReadFileRequest.class)
                .build(),
            FunctionToolCallback.builder("writeFile", writeFile)
                .description("Write content to a file. Use this to create review reports.")
                .inputType(WriteFileRequest.class)
                .build()
        );

        return () -> callbacks.toArray(new ToolCallback[0]);
    }

    // Request records
    public record ReadFileRequest(
        @Description("Relative path to the file from working directory")
        String path
    ) {}

    public record WriteFileRequest(
        @Description("Relative path to the file from working directory")
        String path,
        @Description("Content to write to the file")
        String content
    ) {}
}
