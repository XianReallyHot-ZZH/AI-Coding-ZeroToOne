package com.example.codereview.types;

import org.springframework.context.annotation.Description;

import java.util.Map;

/**
 * Git 命令请求
 */
@Description("执行 Git 命令，支持多种 diff 和 log 操作")
public record GitCommandRequest(
    @Description("Git 操作类型: UNSTAGED_DIFF, STAGED_DIFF, BRANCH_DIFF, COMMIT_DIFF, COMMIT_RANGE_DIFF, SHOW_COMMIT, LOG, STATUS, CURRENT_BRANCH, FILE_DIFF, LIST_CHANGED_FILES")
    GitOperationType operation,
    @Description("操作参数，如分支名(baseBranch)、提交哈希(commitHash, fromCommit, toCommit)、文件路径(filePath)、限制数量(limit)")
    Map<String, String> params
) {}
