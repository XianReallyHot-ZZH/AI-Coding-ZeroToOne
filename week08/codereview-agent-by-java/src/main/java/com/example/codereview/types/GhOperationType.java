package com.example.codereview.types;

/**
 * GitHub CLI 操作类型枚举
 */
public enum GhOperationType {
    PR_VIEW,    // 查看 PR 详情
    PR_DIFF,    // 查看 PR 代码差异
    PR_LIST,    // 列出 PR
    PR_FILES,   // 列出 PR 变更的文件
    ISSUE_VIEW  // 查看关联 Issue
}
