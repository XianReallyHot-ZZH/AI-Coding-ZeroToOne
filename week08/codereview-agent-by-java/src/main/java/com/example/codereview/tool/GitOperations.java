package com.example.codereview.tool;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.types.GitOperationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Git 命令操作封装
 */
@Component
public class GitOperations {

    private static final Logger log = LoggerFactory.getLogger(GitOperations.class);

    private final Path workingDirectory;
    private final int timeoutSeconds;
    private final long maxOutputBytes;

    public GitOperations(CodeReviewProperties properties) {
        this.workingDirectory = Path.of(properties.getWorkingDirectory());
        this.timeoutSeconds = properties.getGit().getTimeoutSeconds();
        this.maxOutputBytes = properties.getGit().getMaxOutputBytes();
        log.info("GitOperations initialized with workingDirectory: {}, timeout: {}s, maxOutput: {}bytes",
            workingDirectory, timeoutSeconds, maxOutputBytes);
    }

    /**
     * 执行 Git 操作
     *
     * @param operation 操作类型
     * @param params    参数
     * @return 命令输出
     */
    public String execute(GitOperationType operation, Map<String, String> params) {
        log.info("Executing git operation: {} with params: {}", operation, params);

        try {
            List<String> command = buildCommand(operation, params);
            return executeCommand(command);
        } catch (IllegalArgumentException e) {
            log.error("Invalid parameters for operation {}: {}", operation, e.getMessage());
            return "Error: " + e.getMessage();
        } catch (Exception e) {
            log.error("Failed to execute git operation: {}", operation, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 构建 Git 命令
     */
    private List<String> buildCommand(GitOperationType operation, Map<String, String> params) {
        return switch (operation) {
            case UNSTAGED_DIFF -> List.of("git", "diff");

            case STAGED_DIFF -> List.of("git", "diff", "--cached");

            case BRANCH_DIFF -> {
                String base = params.getOrDefault("baseBranch", "main");
                yield List.of("git", "diff", base + "...HEAD");
            }

            case COMMIT_DIFF -> {
                String hash = params.get("commitHash");
                if (hash == null || hash.isBlank()) {
                    throw new IllegalArgumentException("commitHash parameter is required for COMMIT_DIFF");
                }
                yield List.of("git", "show", hash);
            }

            case COMMIT_RANGE_DIFF -> {
                String from = params.get("fromCommit");
                String to = params.getOrDefault("toCommit", "HEAD");
                if (from == null || from.isBlank()) {
                    throw new IllegalArgumentException("fromCommit parameter is required for COMMIT_RANGE_DIFF");
                }
                yield List.of("git", "diff", from + ".." + to);
            }

            case SHOW_COMMIT -> {
                String hash = params.get("commitHash");
                if (hash == null || hash.isBlank()) {
                    throw new IllegalArgumentException("commitHash parameter is required for SHOW_COMMIT");
                }
                yield List.of("git", "show", hash, "--stat");
            }

            case LOG -> {
                String limitStr = params.getOrDefault("limit", "10");
                int limit = Integer.parseInt(limitStr);
                yield List.of("git", "log", "--oneline", "-" + limit);
            }

            case STATUS -> List.of("git", "status", "--short");

            case CURRENT_BRANCH -> List.of("git", "branch", "--show-current");

            case FILE_DIFF -> {
                String filePath = params.get("filePath");
                if (filePath == null || filePath.isBlank()) {
                    throw new IllegalArgumentException("filePath parameter is required for FILE_DIFF");
                }
                yield List.of("git", "diff", "--", filePath);
            }

            case LIST_CHANGED_FILES -> {
                String base = params.getOrDefault("baseBranch", "main");
                yield List.of("git", "diff", "--name-only", base + "...HEAD");
            }
        };
    }

    /**
     * 执行命令
     */
    private String executeCommand(List<String> command) {
        log.debug("Executing command: {}", String.join(" ", command));

        try {
            // 检测操作系统
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");

            ProcessBuilder pb = new ProcessBuilder();
            if (isWindows) {
                pb.command("cmd", "/c", String.join(" ", command));
            } else {
                pb.command(command);
            }
            pb.directory(workingDirectory.toFile());
            pb.redirectErrorStream(true);

            Process process = pb.start();
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Command timed out after " + timeoutSeconds + " seconds";
            }

            byte[] outputBytes = process.getInputStream().readAllBytes();

            // 限制输出大小
            if (outputBytes.length > maxOutputBytes) {
                String truncated = new String(outputBytes, 0, (int) maxOutputBytes, StandardCharsets.UTF_8);
                int exitCode = process.exitValue();
                if (exitCode != 0) {
                    return "Error (exit code " + exitCode + ", output truncated): " + truncated;
                }
                return truncated + "\n... [Output truncated, exceeded " + maxOutputBytes + " bytes]";
            }

            String output = new String(outputBytes, StandardCharsets.UTF_8);
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
     * 检查是否在 Git 仓库中
     */
    public boolean isGitRepository() {
        File gitDir = workingDirectory.resolve(".git").toFile();
        return gitDir.exists() && gitDir.isDirectory();
    }
}
