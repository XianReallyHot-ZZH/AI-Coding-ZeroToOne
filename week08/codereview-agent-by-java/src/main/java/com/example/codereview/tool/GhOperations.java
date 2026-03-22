package com.example.codereview.tool;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.types.GhOperationType;
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
 * GitHub CLI (gh) 命令操作封装
 */
@Component
public class GhOperations {

    private static final Logger log = LoggerFactory.getLogger(GhOperations.class);

    private final Path workingDirectory;
    private final int timeoutSeconds;
    private volatile Boolean ghAvailable = null;

    public GhOperations(CodeReviewProperties properties) {
        this.workingDirectory = Path.of(properties.getWorkingDirectory());
        this.timeoutSeconds = properties.getGh().getTimeoutSeconds();
        log.info("GhOperations initialized with workingDirectory: {}, timeout: {}s",
            workingDirectory, timeoutSeconds);
    }

    /**
     * 检查 gh CLI 是否可用
     */
    public boolean isGhAvailable() {
        if (ghAvailable != null) {
            return ghAvailable;
        }

        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");

            ProcessBuilder pb = new ProcessBuilder();
            if (isWindows) {
                pb.command("cmd", "/c", "gh --version");
            } else {
                pb.command("gh", "--version");
            }
            pb.redirectErrorStream(true);

            Process process = pb.start();
            boolean finished = process.waitFor(5, TimeUnit.SECONDS);

            if (finished && process.exitValue() == 0) {
                ghAvailable = true;
                log.info("GitHub CLI (gh) is available");
                return true;
            }
        } catch (Exception e) {
            log.debug("GitHub CLI (gh) is not available: {}", e.getMessage());
        }

        ghAvailable = false;
        log.warn("GitHub CLI (gh) is not installed or not available in PATH");
        return false;
    }

    /**
     * 执行 GitHub CLI 操作
     *
     * @param operation 操作类型
     * @param params    参数
     * @return 命令输出
     */
    public String execute(GhOperationType operation, Map<String, String> params) {
        log.info("Executing gh operation: {} with params: {}", operation, params);

        // 检查 gh 是否可用
        if (!isGhAvailable()) {
            return "Error: GitHub CLI (gh) is not installed or not available in PATH. " +
                "Please install it from https://cli.github.com/";
        }

        try {
            List<String> command = buildCommand(operation, params);
            return executeCommand(command);
        } catch (IllegalArgumentException e) {
            log.error("Invalid parameters for operation {}: {}", operation, e.getMessage());
            return "Error: " + e.getMessage();
        } catch (Exception e) {
            log.error("Failed to execute gh operation: {}", operation, e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 构建 gh 命令
     */
    private List<String> buildCommand(GhOperationType operation, Map<String, String> params) {
        return switch (operation) {
            case PR_VIEW -> {
                String number = params.get("prNumber");
                if (number == null || number.isBlank()) {
                    throw new IllegalArgumentException("prNumber parameter is required for PR_VIEW");
                }
                yield List.of("gh", "pr", "view", number);
            }

            case PR_DIFF -> {
                String number = params.get("prNumber");
                if (number == null || number.isBlank()) {
                    throw new IllegalArgumentException("prNumber parameter is required for PR_DIFF");
                }
                yield List.of("gh", "pr", "diff", number);
            }

            case PR_LIST -> {
                String limitStr = params.getOrDefault("limit", "20");
                yield List.of("gh", "pr", "list", "--state", "open", "--limit", limitStr);
            }

            case PR_FILES -> {
                String number = params.get("prNumber");
                if (number == null || number.isBlank()) {
                    throw new IllegalArgumentException("prNumber parameter is required for PR_FILES");
                }
                yield List.of("gh", "pr", "diff", number, "--name-only");
            }

            case ISSUE_VIEW -> {
                String number = params.get("issueNumber");
                if (number == null || number.isBlank()) {
                    throw new IllegalArgumentException("issueNumber parameter is required for ISSUE_VIEW");
                }
                yield List.of("gh", "issue", "view", number);
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
}
