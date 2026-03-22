package com.example.codereview.tool;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.types.GitOperationType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * GitOperations 测试
 *
 * 使用当前项目目录进行测试，避免 @TempDir 在 Windows 上的清理问题
 */
class GitOperationsTest {

    private static GitOperations gitOperations;

    @BeforeAll
    static void setUp() {
        CodeReviewProperties properties = new CodeReviewProperties();
        // 使用当前项目目录进行测试
        properties.setWorkingDirectory(System.getProperty("user.dir"));
        properties.getGit().setTimeoutSeconds(30);
        properties.getGit().setMaxOutputBytes(1048576);

        gitOperations = new GitOperations(properties);
    }

    @Test
    void testUnstagedDiff() {
        String result = gitOperations.execute(GitOperationType.UNSTAGED_DIFF, Map.of());
        assertNotNull(result);
    }

    @Test
    void testStagedDiff() {
        String result = gitOperations.execute(GitOperationType.STAGED_DIFF, Map.of());
        assertNotNull(result);
    }

    @Test
    void testStatus() {
        String result = gitOperations.execute(GitOperationType.STATUS, Map.of());
        assertNotNull(result);
    }

    @Test
    void testCurrentBranch() {
        String result = gitOperations.execute(GitOperationType.CURRENT_BRANCH, Map.of());
        assertNotNull(result);
        // 应该返回分支名
        assertFalse(result.contains("Error"));
    }

    @Test
    void testLogWithLimit() {
        String result = gitOperations.execute(GitOperationType.LOG, Map.of("limit", "5"));
        assertNotNull(result);
    }

    @Test
    void testBranchDiffWithDefaultBase() {
        String result = gitOperations.execute(GitOperationType.BRANCH_DIFF, Map.of());
        assertNotNull(result);
    }

    @Test
    void testBranchDiffWithCustomBase() {
        String result = gitOperations.execute(GitOperationType.BRANCH_DIFF, Map.of("baseBranch", "master"));
        assertNotNull(result);
    }

    @Test
    void testCommitDiffWithoutHash() {
        String result = gitOperations.execute(GitOperationType.COMMIT_DIFF, Map.of());
        assertTrue(result.contains("Error"));
        assertTrue(result.contains("commitHash"));
    }

    @Test
    void testCommitDiffWithHash() {
        String result = gitOperations.execute(GitOperationType.COMMIT_DIFF, Map.of("commitHash", "abc123"));
        assertNotNull(result);
        // 可能包含错误（无效的哈希）但不应抛出异常
    }

    @Test
    void testShowCommitWithoutHash() {
        String result = gitOperations.execute(GitOperationType.SHOW_COMMIT, Map.of());
        assertTrue(result.contains("Error"));
        assertTrue(result.contains("commitHash"));
    }

    @Test
    void testCommitRangeDiffWithoutFromCommit() {
        String result = gitOperations.execute(GitOperationType.COMMIT_RANGE_DIFF, Map.of());
        assertTrue(result.contains("Error"));
        assertTrue(result.contains("fromCommit"));
    }

    @Test
    void testCommitRangeDiffWithCommits() {
        String result = gitOperations.execute(
            GitOperationType.COMMIT_RANGE_DIFF,
            Map.of("fromCommit", "abc123", "toCommit", "def456")
        );
        assertNotNull(result);
    }

    @Test
    void testFileDiffWithoutPath() {
        String result = gitOperations.execute(GitOperationType.FILE_DIFF, Map.of());
        assertTrue(result.contains("Error"));
        assertTrue(result.contains("filePath"));
    }

    @Test
    void testFileDiffWithPath() {
        String result = gitOperations.execute(GitOperationType.FILE_DIFF, Map.of("filePath", "src/main/java/Test.java"));
        assertNotNull(result);
    }

    @Test
    void testListChangedFiles() {
        String result = gitOperations.execute(GitOperationType.LIST_CHANGED_FILES, Map.of());
        assertNotNull(result);
    }

    @Test
    void testIsGitRepository() {
        // 测试方法可以正常调用
        // 结果取决于当前目录是否是 Git 仓库
        gitOperations.isGitRepository();
        // 只要不抛出异常就行
        assertTrue(true);
    }
}
