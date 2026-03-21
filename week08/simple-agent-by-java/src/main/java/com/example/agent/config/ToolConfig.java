package com.example.agent.config;

import com.example.agent.tool.BuiltinTools;
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
 * 工具配置类 - 定义内置工具
 */
@Configuration
public class ToolConfig {

    // ===== 函数式工具定义 (Spring AI 自动发现) =====

    @Bean
    @Description("Execute a shell command and return the output. Use this for running system commands.")
    public Function<BashRequest, String> bash(BuiltinTools builtinTools) {
        return request -> builtinTools.bash(request.command(), request.timeout());
    }

    @Bean
    @Description("Read the content of a file from the filesystem")
    public Function<ReadFileRequest, String> readFile(BuiltinTools builtinTools) {
        return request -> builtinTools.readFile(request.path());
    }

    @Bean
    @Description("Write content to a file, creating parent directories if needed")
    public Function<WriteFileRequest, String> writeFile(BuiltinTools builtinTools) {
        return request -> builtinTools.writeFile(request.path(), request.content());
    }

    @Bean
    @Description("Make an HTTP request and return the response")
    public Function<HttpRequest, String> http(BuiltinTools builtinTools) {
        return request -> builtinTools.http(request.method(), request.url(), request.body(), request.headers());
    }

    @Bean
    @Description("List files and directories in a given path")
    public Function<ListFilesRequest, String> listFiles(BuiltinTools builtinTools) {
        return request -> builtinTools.listFiles(request.path());
    }

    @Bean
    @Description("Check if a file or directory exists and get its info")
    public Function<FileExistsRequest, String> fileExists(BuiltinTools builtinTools) {
        return request -> builtinTools.fileExists(request.path());
    }

    // ===== 内置工具回调提供者 =====

    @Bean
    @Primary
    public ToolCallbackProvider builtinToolCallbackProvider(
            Function<BashRequest, String> bash,
            Function<ReadFileRequest, String> readFile,
            Function<WriteFileRequest, String> writeFile,
            Function<HttpRequest, String> http,
            Function<ListFilesRequest, String> listFiles,
            Function<FileExistsRequest, String> fileExists) {

        List<ToolCallback> callbacks = List.of(
            FunctionToolCallback.builder("bash", bash)
                .description("Execute a shell command and return the output")
                .inputType(BashRequest.class)
                .build(),
            FunctionToolCallback.builder("readFile", readFile)
                .description("Read the content of a file from the filesystem")
                .inputType(ReadFileRequest.class)
                .build(),
            FunctionToolCallback.builder("writeFile", writeFile)
                .description("Write content to a file, creating parent directories if needed")
                .inputType(WriteFileRequest.class)
                .build(),
            FunctionToolCallback.builder("http", http)
                .description("Make an HTTP request and return the response")
                .inputType(HttpRequest.class)
                .build(),
            FunctionToolCallback.builder("listFiles", listFiles)
                .description("List files and directories in a given path")
                .inputType(ListFilesRequest.class)
                .build(),
            FunctionToolCallback.builder("fileExists", fileExists)
                .description("Check if a file or directory exists and get its info")
                .inputType(FileExistsRequest.class)
                .build()
        );

        return () -> callbacks.toArray(new ToolCallback[0]);
    }

    // Request records
    public record BashRequest(String command, Integer timeout) {}
    public record ReadFileRequest(String path) {}
    public record WriteFileRequest(String path, String content) {}
    public record HttpRequest(String method, String url, String body, String headers) {}
    public record ListFilesRequest(String path) {}
    public record FileExistsRequest(String path) {}
}
