package com.example.codereview.tool;

import com.example.codereview.config.CodeReviewProperties;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CodeReviewTools 测试
 *
 * 使用临时目录进行测试
 */
class CodeReviewToolsTest {

    private static Path tempDir;
    private static CodeReviewTools tools;

    @BeforeAll
    static void setUp() throws IOException {
        tempDir = Files.createTempDirectory("codereview-test-");
        CodeReviewProperties properties = new CodeReviewProperties();
        properties.setWorkingDirectory(tempDir.toString());
        properties.setMaxFileSize(10485760); // 10MB

        tools = new CodeReviewTools(properties);
    }

    @AfterAll
    static void tearDown() throws IOException {
        // 清理临时目录
        Files.walk(tempDir)
            .sorted((a, b) -> b.compareTo(a)) // 逆序删除，先删文件再删目录
            .forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    // 忽略删除失败
                }
            });
    }

    @Test
    void testReadFileNotExists() {
        String result = tools.readFile("nonexistent.txt");
        assertTrue(result.contains("Error"));
        assertTrue(result.contains("not found"));
    }

    @Test
    void testReadFileSuccess() throws Exception {
        Path testFile = tempDir.resolve("test.txt");
        Files.writeString(testFile, "Hello, World!");

        String result = tools.readFile("test.txt");
        assertEquals("Hello, World!", result);
    }

    @Test
    void testReadFileInSubdirectory() throws Exception {
        Path subDir = tempDir.resolve("subdir");
        Files.createDirectories(subDir);
        Path testFile = subDir.resolve("test.txt");
        Files.writeString(testFile, "Nested content");

        String result = tools.readFile("subdir/test.txt");
        assertEquals("Nested content", result);
    }

    @Test
    void testReadPathTraversalBlocked() {
        String result = tools.readFile("../outside.txt");
        assertTrue(result.contains("Error") || result.contains("denied"));
    }

    @Test
    void testReadAbsolutePathBlocked() {
        String result = tools.readFile("/etc/passwd");
        assertTrue(result.contains("Error") || result.contains("denied"));
    }

    @Test
    void testWriteFileSuccess() {
        String result = tools.writeFile("output.txt", "Test content");
        assertTrue(result.contains("Successfully"));
        assertTrue(result.contains("12 bytes"));

        // 验证文件已创建
        assertTrue(Files.exists(tempDir.resolve("output.txt")));
    }

    @Test
    void testWriteFileCreateDirectories() {
        String result = tools.writeFile("deep/nested/path/output.txt", "Nested content");
        assertTrue(result.contains("Successfully"));

        // 验证文件和目录已创建
        assertTrue(Files.exists(tempDir.resolve("deep/nested/path/output.txt")));
    }

    @Test
    void testWritePathTraversalBlocked() {
        String result = tools.writeFile("../outside.txt", "content");
        assertTrue(result.contains("Error") || result.contains("denied"));
    }

    @Test
    void testReadDirectory() throws Exception {
        Path dir = tempDir.resolve("testdir");
        Files.createDirectories(dir);

        String result = tools.readFile("testdir");
        assertTrue(result.contains("Error") || result.contains("not a regular file"));
    }

    @Test
    void testWriteNullContent() throws Exception {
        String result = tools.writeFile("empty.txt", null);
        assertTrue(result.contains("Successfully"));
        assertEquals("", Files.readString(tempDir.resolve("empty.txt")));
    }

    @Test
    void testGetWorkingDirectory() {
        Path workDir = tools.getWorkingDirectory();
        assertEquals(tempDir.toAbsolutePath().normalize(), workDir);
    }
}
