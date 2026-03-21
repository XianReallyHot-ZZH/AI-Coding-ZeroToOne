package com.example.agent.config;

import com.example.agent.tool.BuiltinTools;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.function.Function;

/**
 * 工具配置类 - 使用函数式接口定义工具
 */
@Configuration
public class ToolConfig {

    /**
     * bash 工具 - 执行 shell 命令
     */
    @Bean
    @Description("Execute a shell command and return the output. Use this for running system commands.")
    public Function<BashRequest, String> bash(BuiltinTools builtinTools) {
        return request -> builtinTools.bash(request.command(), request.timeout());
    }

    /**
     * readFile 工具 - 读取文件内容
     */
    @Bean
    @Description("Read the content of a file from the filesystem")
    public Function<ReadFileRequest, String> readFile(BuiltinTools builtinTools) {
        return request -> builtinTools.readFile(request.path());
    }

    /**
     * writeFile 工具 - 写入文件
     */
    @Bean
    @Description("Write content to a file, creating parent directories if needed")
    public Function<WriteFileRequest, String> writeFile(BuiltinTools builtinTools) {
        return request -> builtinTools.writeFile(request.path(), request.content());
    }

    /**
     * http 工具 - 发送 HTTP 请求
     */
    @Bean
    @Description("Make an HTTP request and return the response")
    public Function<HttpRequest, String> http(BuiltinTools builtinTools) {
        return request -> builtinTools.http(request.method(), request.url(), request.body(), request.headers());
    }

    /**
     * listFiles 工具 - 列出目录内容
     */
    @Bean
    @Description("List files and directories in a given path")
    public Function<ListFilesRequest, String> listFiles(BuiltinTools builtinTools) {
        return request -> builtinTools.listFiles(request.path());
    }

    /**
     * fileExists 工具 - 检查文件是否存在
     */
    @Bean
    @Description("Check if a file or directory exists and get its info")
    public Function<FileExistsRequest, String> fileExists(BuiltinTools builtinTools) {
        return request -> builtinTools.fileExists(request.path());
    }

    // Request records
    public record BashRequest(String command, Integer timeout) {}
    public record ReadFileRequest(String path) {}
    public record WriteFileRequest(String path, String content) {}
    public record HttpRequest(String method, String url, String body, String headers) {}
    public record ListFilesRequest(String path) {}
    public record FileExistsRequest(String path) {}
}
