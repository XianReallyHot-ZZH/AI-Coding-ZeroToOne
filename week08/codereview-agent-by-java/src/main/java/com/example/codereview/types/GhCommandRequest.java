package com.example.codereview.types;

import org.springframework.context.annotation.Description;

import java.util.Map;

/**
 * GitHub CLI 命令请求
 */
@Description("执行 GitHub CLI 命令，用于获取 Pull Request 信息")
public record GhCommandRequest(
    @Description("GitHub 操作类型: PR_VIEW, PR_DIFF, PR_LIST, PR_FILES, ISSUE_VIEW")
    GhOperationType operation,
    @Description("操作参数，如 PR 编号(prNumber)、Issue 编号(issueNumber)、限制数量(limit)")
    Map<String, String> params
) {}
