package com.example.codereview.types;

/**
 * Git 操作类型枚举
 */
public enum GitOperationType {
    // 差异查看
    UNSTAGED_DIFF,      // 未暂存的改动
    STAGED_DIFF,        // 已暂存的改动
    BRANCH_DIFF,        // 分支间差异
    COMMIT_DIFF,        // 某提交的改动
    COMMIT_RANGE_DIFF,  // 提交范围差异

    // 信息获取
    SHOW_COMMIT,        // 查看某提交详情
    LOG,                // 查看提交历史
    STATUS,             // 查看仓库状态
    CURRENT_BRANCH,     // 获取当前分支名

    // 文件操作
    FILE_DIFF,          // 某文件的改动
    LIST_CHANGED_FILES  // 列出变更的文件
}
