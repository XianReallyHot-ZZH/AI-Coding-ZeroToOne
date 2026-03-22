package com.example.codereview.tool;

import com.example.codereview.config.CodeReviewProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 代码审查工具集 - 提供文件读写等基础工具
 */
@Component
public class CodeReviewTools {

    private static final Logger log = LoggerFactory.getLogger(CodeReviewTools.class);

    private final Path workingDirectory;
    private final long maxFileSize;

    public CodeReviewTools(CodeReviewProperties properties) {
        this.workingDirectory = Path.of(properties.getWorkingDirectory()).toAbsolutePath().normalize();
        this.maxFileSize = properties.getMaxFileSize();
        log.info("CodeReviewTools initialized with workingDirectory: {}, maxFileSize: {}bytes",
            workingDirectory, maxFileSize);
    }

    /**
     * 读取文件内容
     *
     * @param path 相对于工作目录的文件路径
     * @return 文件内容或错误消息
     */
    public String readFile(String path) {
        log.info("Reading file: {}", path);

        try {
            Path resolvedPath = resolveAndValidatePath(path);

            if (!Files.exists(resolvedPath)) {
                return "Error: File not found: " + path;
            }

            if (!Files.isRegularFile(resolvedPath)) {
                return "Error: Not a regular file: " + path;
            }

            // 检查文件大小
            long fileSize = Files.size(resolvedPath);
            if (fileSize > maxFileSize) {
                return "Error: File too large (" + fileSize + " bytes). Maximum allowed size is " + maxFileSize + " bytes.";
            }

            return Files.readString(resolvedPath);

        } catch (SecurityException e) {
            log.warn("Security violation reading file: {}", path);
            return "Error: Access denied - path must be within working directory";
        } catch (Exception e) {
            log.error("Failed to read file: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 写入文件内容
     *
     * @param path    相对于工作目录的文件路径
     * @param content 要写入的内容
     * @return 成功消息或错误消息
     */
    public String writeFile(String path, String content) {
        log.info("Writing file: {} ({} bytes)", path, content != null ? content.length() : 0);

        try {
            Path resolvedPath = resolveAndValidatePath(path);

            // 创建父目录
            Path parentDir = resolvedPath.getParent();
            if (parentDir != null && !Files.exists(parentDir)) {
                Files.createDirectories(parentDir);
            }

            Files.writeString(resolvedPath, content != null ? content : "");

            return "Successfully wrote " + (content != null ? content.length() : 0) + " bytes to " + path;

        } catch (SecurityException e) {
            log.warn("Security violation writing file: {}", path);
            return "Error: Access denied - path must be within working directory";
        } catch (Exception e) {
            log.error("Failed to write file: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 解析并验证路径安全性
     *
     * @param path 相对路径
     * @return 解析后的绝对路径
     * @throws SecurityException 如果路径不安全
     */
    private Path resolveAndValidatePath(String path) throws SecurityException {
        if (path == null || path.isBlank()) {
            throw new SecurityException("Path cannot be empty");
        }

        // 规范化路径
        Path resolvedPath = workingDirectory.resolve(path).toAbsolutePath().normalize();

        // 检查路径穿越
        String normalizedPath = path.replace('\\', '/');
        if (normalizedPath.contains("../") || normalizedPath.startsWith("/")) {
            log.warn("Path traversal attempt detected: {}", path);
            throw new SecurityException("Path traversal not allowed");
        }

        // 确保解析后的路径在工作目录内
        if (!resolvedPath.startsWith(workingDirectory)) {
            log.warn("Path outside working directory: {} resolves to {}", path, resolvedPath);
            throw new SecurityException("Path must be within working directory");
        }

        return resolvedPath;
    }

    /**
     * 获取工作目录
     */
    public Path getWorkingDirectory() {
        return workingDirectory;
    }
}
