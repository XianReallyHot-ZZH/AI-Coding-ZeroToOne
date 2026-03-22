package com.example.codereview.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CodeReviewService 测试
 *
 * 注意：完整的集成测试需要 Mock ChatModel，这里只测试基本结构
 */
class CodeReviewServiceTest {

    @Test
    void testServiceExists() {
        // 验证服务类存在
        try {
            Class<?> serviceClass = Class.forName("com.example.codereview.service.CodeReviewService");
            assertNotNull(serviceClass);
        } catch (ClassNotFoundException e) {
            fail("CodeReviewService class not found");
        }
    }

    @Test
    void testServiceMethods() throws NoSuchMethodException {
        Class<?> serviceClass = com.example.codereview.service.CodeReviewService.class;

        // 验证方法存在
        assertNotNull(serviceClass.getMethod("review", String.class, String.class));
        assertNotNull(serviceClass.getMethod("reviewStream", String.class, String.class));
        assertNotNull(serviceClass.getMethod("clearMemory", String.class));
        assertNotNull(serviceClass.getMethod("getAvailableTools"));
        assertNotNull(serviceClass.getMethod("getSystemPrompt"));
    }
}
