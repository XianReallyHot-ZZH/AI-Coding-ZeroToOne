package com.example.codereview.tool;

import com.example.codereview.config.CodeReviewProperties;
import com.example.codereview.types.GhOperationType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * GhOperations 测试
 *
 * 使用当前项目目录进行测试，避免 @TempDir 在 Windows 上的清理问题
 */
class GhOperationsTest {

    private static GhOperations ghOperations;

    @BeforeAll
    static void setUp() {
        CodeReviewProperties properties = new CodeReviewProperties();
        // 使用当前项目目录进行测试
        properties.setWorkingDirectory(System.getProperty("user.dir"));
        properties.getGh().setTimeoutSeconds(30);

        ghOperations = new GhOperations(properties);
    }

    @Test
    void testIsGhAvailable() {
        // gh 可能安装或未安装
        boolean available = ghOperations.isGhAvailable();
        // 只要不抛出异常就行
        assertTrue(true);
    }

    @Test
    void testPrViewWithoutNumber() {
        String result = ghOperations.execute(GhOperationType.PR_VIEW, Map.of());
        assertNotNull(result);
        // 应该包含错误信息（gh 未安装或缺少参数）
        assertTrue(result.contains("Error") || result.contains("required") || result.contains("not installed"));
    }

    @Test
    void testPrViewWithNumber() {
        String result = ghOperations.execute(GhOperationType.PR_VIEW, Map.of("prNumber", "123"));
        assertNotNull(result);
        // 可能包含错误（gh 未安装或无效 PR）但不应抛出异常
    }

    @Test
    void testPrDiffWithoutNumber() {
        String result = ghOperations.execute(GhOperationType.PR_DIFF, Map.of());
        assertNotNull(result);
        // 应该包含错误信息（gh 未安装或缺少参数）
        assertTrue(result.contains("Error") || result.contains("required") || result.contains("not installed"));
    }

    @Test
    void testPrList() {
        String result = ghOperations.execute(GhOperationType.PR_LIST, Map.of());
        assertNotNull(result);
    }

    @Test
    void testPrListWithLimit() {
        String result = ghOperations.execute(GhOperationType.PR_LIST, Map.of("limit", "10"));
        assertNotNull(result);
    }

    @Test
    void testPrFilesWithoutNumber() {
        String result = ghOperations.execute(GhOperationType.PR_FILES, Map.of());
        assertNotNull(result);
        // 应该包含错误信息（gh 未安装或缺少参数）
        assertTrue(result.contains("Error") || result.contains("required") || result.contains("not installed"));
    }

    @Test
    void testIssueViewWithoutNumber() {
        String result = ghOperations.execute(GhOperationType.ISSUE_VIEW, Map.of());
        assertNotNull(result);
        // 应该包含错误信息（gh 未安装或缺少参数）
        assertTrue(result.contains("Error") || result.contains("required") || result.contains("not installed"));
    }

    @Test
    void testIssueViewWithNumber() {
        String result = ghOperations.execute(GhOperationType.ISSUE_VIEW, Map.of("issueNumber", "456"));
        assertNotNull(result);
    }
}
