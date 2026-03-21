package com.example.agent.tool;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 内置工具集 - 提供 bash, readFile, writeFile, http 等基础工具
 */
@Component
public class BuiltinTools {

    private static final Logger log = LoggerFactory.getLogger(BuiltinTools.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Execute a shell command and return the output
     *
     * @param command The shell command to execute
     * @param timeout Timeout in milliseconds, default 30000
     * @return Command output or error message
     */
    public String bash(String command, Integer timeout) {
        int timeoutMs = timeout != null ? timeout : 30000;
        log.info("Executing command: {} (timeout: {}ms)", command, timeoutMs);

        try {
            // 检测操作系统
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");

            ProcessBuilder pb = new ProcessBuilder();
            if (isWindows) {
                pb.command("cmd", "/c", command);
            } else {
                pb.command("sh", "-c", command);
            }
            pb.redirectErrorStream(true);

            Process process = pb.start();
            boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Command timed out after " + timeoutMs + "ms";
            }

            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.exitValue();

            if (exitCode != 0) {
                return "Error (exit code " + exitCode + "): " + output;
            }
            return output.isEmpty() ? "Command executed successfully (no output)" : output;

        } catch (Exception e) {
            log.error("Failed to execute command: {}", command, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * Read the content of a file
     *
     * @param path The path to the file to read
     * @return File content or error message
     */
    public String readFile(String path) {
        log.info("Reading file: {}", path);

        try {
            Path filePath = Path.of(path);
            if (!Files.exists(filePath)) {
                return "Error: File not found: " + path;
            }
            if (!Files.isRegularFile(filePath)) {
                return "Error: Not a regular file: " + path;
            }

            // 检查文件大小，避免读取过大的文件
            long fileSize = Files.size(filePath);
            if (fileSize > 10 * 1024 * 1024) { // 10MB 限制
                return "Error: File too large (" + fileSize + " bytes). Maximum allowed size is 10MB.";
            }

            return Files.readString(filePath);

        } catch (Exception e) {
            log.error("Failed to read file: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * Write content to a file, creating parent directories if needed
     *
     * @param path    The path to the file to write
     * @param content The content to write to the file
     * @return Success message or error message
     */
    public String writeFile(String path, String content) {
        log.info("Writing file: {} ({} bytes)", path, content != null ? content.length() : 0);

        try {
            Path filePath = Path.of(path);

            // 创建父目录
            Path parentDir = filePath.getParent();
            if (parentDir != null && !Files.exists(parentDir)) {
                Files.createDirectories(parentDir);
            }

            Files.writeString(filePath, content != null ? content : "");

            return "Successfully wrote " + (content != null ? content.length() : 0) + " bytes to " + path;

        } catch (Exception e) {
            log.error("Failed to write file: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * Make an HTTP request and return the response
     *
     * @param method  HTTP method (GET, POST, PUT, DELETE, etc.)
     * @param url     The URL to request
     * @param body    Request body for POST/PUT requests (optional)
     * @param headers Request headers in JSON format (optional)
     * @return Response with status code and body
     */
    public String http(String method, String url, String body, String headers) {
        log.info("HTTP {} {}", method, url);

        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(60));

            // 设置 HTTP 方法
            String methodUpper = method.toUpperCase();
            switch (methodUpper) {
                case "GET":
                    requestBuilder.GET();
                    break;
                case "POST":
                    requestBuilder.POST(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
                    requestBuilder.header("Content-Type", "application/json");
                    break;
                case "PUT":
                    requestBuilder.PUT(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
                    requestBuilder.header("Content-Type", "application/json");
                    break;
                case "DELETE":
                    requestBuilder.DELETE();
                    break;
                case "PATCH":
                    requestBuilder.method("PATCH", HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
                    requestBuilder.header("Content-Type", "application/json");
                    break;
                default:
                    return "Error: Unsupported HTTP method: " + method;
            }

            // 添加自定义请求头
            if (headers != null && !headers.isEmpty()) {
                try {
                    Map<String, String> headerMap = objectMapper.readValue(headers, new TypeReference<Map<String, String>>() {});
                    headerMap.forEach(requestBuilder::header);
                } catch (IOException e) {
                    log.warn("Failed to parse headers JSON: {}", headers, e);
                }
            }

            HttpRequest request = requestBuilder.build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            StringBuilder result = new StringBuilder();
            result.append("Status: ").append(response.statusCode()).append("\n");

            // 添加响应头信息
            if (!response.headers().map().isEmpty()) {
                result.append("Headers:\n");
                response.headers().map().forEach((key, values) -> {
                    result.append("  ").append(key).append(": ").append(String.join(", ", values)).append("\n");
                });
            }

            result.append("\nBody:\n").append(response.body());

            return result.toString();

        } catch (Exception e) {
            log.error("HTTP request failed: {} {}", method, url, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * List files in a directory
     *
     * @param path The directory path to list
     * @return List of files and directories
     */
    public String listFiles(String path) {
        log.info("Listing directory: {}", path);

        try {
            Path dirPath = Path.of(path);
            if (!Files.exists(dirPath)) {
                return "Error: Directory not found: " + path;
            }
            if (!Files.isDirectory(dirPath)) {
                return "Error: Not a directory: " + path;
            }

            StringBuilder result = new StringBuilder();
            result.append("Contents of ").append(path).append(":\n");

            try (var stream = Files.list(dirPath)) {
                stream.sorted().forEach(p -> {
                    try {
                        String type = Files.isDirectory(p) ? "[DIR] " : "[FILE]";
                        String size = Files.isDirectory(p) ? "" : " (" + Files.size(p) + " bytes)";
                        result.append(type).append(p.getFileName()).append(size).append("\n");
                    } catch (IOException e) {
                        result.append("[ERROR] ").append(p.getFileName()).append("\n");
                    }
                });
            }

            return result.toString();

        } catch (Exception e) {
            log.error("Failed to list directory: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * Check if a file or directory exists
     *
     * @param path The path to check
     * @return Information about the path
     */
    public String fileExists(String path) {
        log.info("Checking path: {}", path);

        try {
            Path filePath = Path.of(path);
            if (!Files.exists(filePath)) {
                return "Path does not exist: " + path;
            }

            StringBuilder result = new StringBuilder();
            result.append("Path exists: ").append(path).append("\n");
            result.append("Type: ").append(Files.isDirectory(filePath) ? "Directory" : "File").append("\n");
            result.append("Size: ").append(Files.size(filePath)).append(" bytes\n");
            result.append("Last modified: ").append(Files.getLastModifiedTime(filePath)).append("\n");
            result.append("Readable: ").append(Files.isReadable(filePath)).append("\n");
            result.append("Writable: ").append(Files.isWritable(filePath)).append("\n");

            return result.toString();

        } catch (Exception e) {
            log.error("Failed to check path: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }
}
