# Code Review Agent 设计文档

> 版本: 1.0
> 日期: 2026-03-22
> 基于: simple-agent-by-java 架构

---

## 1. 概述

### 1.1 项目目标

构建一个智能代码审查 Agent，能够：
- 理解用户的自然语言审查请求
- 自动选择合适的 Git/GitHub 命令获取代码变更
- 基于系统提示词进行专业的代码审查
- 提供结构化、可操作的审查反馈

### 1.2 核心能力

| 能力 | 描述 |
|------|------|
| 智能意图解析 | 理解用户想要审查的内容类型（分支、提交、PR 等） |
| 多源代码获取 | 支持 git diff、git show、gh pr 等多种方式获取代码变更 |
| 专业代码审查 | 基于 system.md 定制的审查规则和输出格式 |
| 上下文理解 | 自动读取相关文件获取完整上下文 |

### 1.3 用户场景

```
用户: 帮我 review 当前 branch 新代码
用户: 帮我 review commit 13bad5 之后的代码
用户: 帮我 review pull request 12 的代码
用户: 帮我 review main 分支和当前分支的差异
用户: 帮我 review 未提交的改动
```

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Code Review Agent                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Controller  │  │   Service   │  │   System Prompt     │  │
│  │ (REST API)  │──│ (AgentLogic)│──│   (system.md)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                                   │
│         ▼                ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Tool Layer                        │    │
│  ├─────────────┬─────────────┬────────────┬────────────┤    │
│  │  readFile   │  writeFile  │ gitCommand │ ghCommand  │    │
│  └─────────────┴─────────────┴────────────┴────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Git / GitHub CLI                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 |
|------|------|
| `CodeReviewController` | REST API 入口，处理审查请求 |
| `CodeReviewService` | 核心业务逻辑，协调工具调用 |
| `CodeReviewTools` | 代码审查专用工具实现 |
| `GitOperations` | Git 命令封装与执行 |
| `GhOperations` | GitHub CLI 命令封装 |

### 2.3 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Spring Boot 3.5.x |
| AI 框架 | Spring AI 1.1.x |
| 工具定义 | Function + ToolCallback 模式 |
| 配置管理 | application.yml + @ConfigurationProperties |
| 日志 | SLF4J + Logback |

---

## 3. 工具设计

### 3.1 readFile 工具

**复用 simple-agent-by-java 的实现，添加安全限制。**

```java
@Description("读取指定文件的内容，仅限当前工作目录下的文件")
public record ReadFileRequest(
    @Description("相对于当前工作目录的文件路径") String path
) {}
```

**安全措施：**
- 路径必须相对于当前工作目录
- 禁止 `../` 路径穿越
- 限制最大文件大小 (1MB)

### 3.2 writeFile 工具

**复用 simple-agent-by-java 的实现，用于输出审查报告。**

```java
@Description("将内容写入指定文件，用于创建审查报告")
public record WriteFileRequest(
    @Description("相对于当前工作目录的文件路径") String path,
    @Description("要写入的文件内容") String content
) {}
```

### 3.3 gitCommand 工具 (新增)

**核心工具：执行各种 Git 命令获取代码变更。**

```java
@Description("执行 Git 命令，支持多种 diff 和 log 操作")
public record GitCommandRequest(
    @Description("Git 操作类型") GitOperationType operation,
    @Description("操作参数，如分支名、提交哈希等") Map<String, String> params
) {}

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
```

**Git 命令映射表：**

| OperationType | Git 命令 | 参数 |
|---------------|----------|------|
| `UNSTAGED_DIFF` | `git diff` | - |
| `STAGED_DIFF` | `git diff --cached` | - |
| `BRANCH_DIFF` | `git diff {baseBranch}...HEAD` | `baseBranch` |
| `COMMIT_DIFF` | `git show {commitHash}` | `commitHash` |
| `COMMIT_RANGE_DIFF` | `git diff {fromCommit}..{toCommit}` | `fromCommit`, `toCommit` |
| `SHOW_COMMIT` | `git show {commitHash} --stat` | `commitHash` |
| `LOG` | `git log --oneline -{limit}` | `limit` |
| `STATUS` | `git status --short` | - |
| `CURRENT_BRANCH` | `git branch --show-current` | - |
| `FILE_DIFF` | `git diff -- {filePath}` | `filePath` |
| `LIST_CHANGED_FILES` | `git diff --name-only {baseBranch}...HEAD` | `baseBranch` |

### 3.4 ghCommand 工具 (新增)

**GitHub CLI 工具：获取 PR 信息。**

```java
@Description("执行 GitHub CLI 命令，用于获取 Pull Request 信息")
public record GhCommandRequest(
    @Description("GitHub 操作类型") GhOperationType operation,
    @Description("操作参数") Map<String, String> params
) {}

public enum GhOperationType {
    PR_VIEW,    // 查看 PR 详情
    PR_DIFF,    // 查看 PR 代码差异
    PR_LIST,    // 列出 PR
    PR_FILES,   // 列出 PR 变更的文件
    ISSUE_VIEW  // 查看关联 Issue
}
```

**gh 命令映射表：**

| OperationType | gh 命令 | 参数 |
|---------------|---------|------|
| `PR_VIEW` | `gh pr view {prNumber}` | `prNumber` |
| `PR_DIFF` | `gh pr diff {prNumber}` | `prNumber` |
| `PR_LIST` | `gh pr list --state open --limit {limit}` | `limit` |
| `PR_FILES` | `gh pr diff {prNumber} --name-only` | `prNumber` |
| `ISSUE_VIEW` | `gh issue view {issueNumber}` | `issueNumber` |

---

## 4. 用户意图解析

### 4.1 意图类型

Agent 需要理解用户的自然语言请求，选择正确的工具和参数。

| 意图类型 | 示例请求 | 工具调用 |
|----------|----------|----------|
| **未提交改动** | "review 当前改动"、"review 未提交代码" | `git status` + `git diff` + `git diff --cached` |
| **分支差异** | "review 当前分支新代码"、"review 和 main 的差异" | `git diff {base}...HEAD` |
| **提交差异** | "review commit 13bad5"、"review 某个提交" | `git show {hash}` |
| **提交范围** | "review 13bad5 之后的代码"、"review A 到 B 的改动" | `git diff {from}..{to}` |
| **PR 审查** | "review PR 12"、"review pull request #12" | `gh pr diff {number}` |
| **文件审查** | "review src/main 目录"、"review 这个文件" | 读取文件 + `git diff -- {path}` |

### 4.2 解析策略

**让 LLM 理解意图：**

系统提示词中包含详细的意图解析指南，LLM 根据用户输入自动选择：
1. 分析用户请求中的关键词
2. 识别审查目标类型
3. 提取参数（分支名、提交哈希、PR 编号等）
4. 选择正确的工具调用序列

**示例提示词片段：**
```markdown
## 如何确定审查类型

根据用户输入，确定需要执行的审查类型：

| 输入模式 | 审查类型 | 操作 |
|----------|----------|------|
| 无参数 / "当前改动" / "未提交" | 未提交改动 | 先执行 git status，再 git diff 和 git diff --cached |
| "当前分支" / "和 X 的差异" | 分支差异 | 执行 git diff {base}...HEAD，默认 base 为 main/master |
| 40字符/短哈希 / "commit X" | 提交审查 | 执行 git show {hash} |
| "PR X" / "pull request X" | PR 审查 | 执行 gh pr diff {number} |
| "X 之后" / "从 X 到 Y" | 提交范围 | 执行 git diff X..HEAD 或 git diff X..Y |
```

### 4.3 默认行为

| 场景 | 默认行为 |
|------|----------|
| 未指定分支 | 与 `main` 分支比较（如果不存在则尝试 `master`） |
| 未指定 PR | 提示用户提供 PR 编号 |
| 路径不在 Git 仓库 | 提示用户切换到正确的目录 |

---

## 5. 系统提示词设计

### 5.1 提示词结构

系统提示词基于 `system.md` 文件，结构如下：

```markdown
# Code Review Agent System Prompt

## 身份与性格
[定义 Agent 的角色和沟通风格]

## 可用工具
[列出工具及其用途]

## 工作方式
[定义响应式沟通、任务执行规则]

## 代码审查工作流
### 1. 确定审查内容
[意图解析指南]

### 2. 收集上下文
[读取完整文件的指导]

### 3. 审查重点
[Bug、结构、性能、行为变更]

### 4. 确认问题
[确保准确性，不做假设]

## 输出格式
[Markdown 格式规范]

## 审查输出模板
[结构化输出模板]
```

### 5.2 配置方式

在 `application.yml` 中配置：

```yaml
codereview:
  system-prompt: classpath:prompts/system.md
  default-model: claude-sonnet-4-6
  max-steps: 200
```

系统提示词从 `src/main/resources/prompts/system.md` 加载。

---

## 6. 项目结构

```
codereview-agent-by-java/
├── pom.xml
├── README.md
├── docker-compose.yml
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/com/example/codereview/
    │   │   ├── CodeReviewAgentApplication.java
    │   │   ├── config/
    │   │   │   ├── CodeReviewProperties.java    # 配置属性
    │   │   │   ├── ToolConfig.java              # 工具注册
    │   │   │   └── ChatMemoryConfig.java        # 会话记忆
    │   │   ├── controller/
    │   │   │   └── CodeReviewController.java    # REST API
    │   │   ├── service/
    │   │   │   └── CodeReviewService.java       # 核心服务
    │   │   ├── tool/
    │   │   │   ├── CodeReviewTools.java         # 工具实现
    │   │   │   ├── GitOperations.java           # Git 操作封装
    │   │   │   └── GhOperations.java            # GitHub CLI 封装
    │   │   ├── types/
    │   │   │   ├── GitCommandRequest.java       # Git 请求类型
    │   │   │   ├── GhCommandRequest.java        # GH 请求类型
    │   │   │   └── GitOperationType.java        # 操作枚举
    │   │   ├── exception/
    │   │   │   └── GlobalExceptionHandler.java
    │   │   └── metrics/
    │   │       └── AgentMetrics.java
    │   └── resources/
    │       ├── application.yml
    │       └── prompts/
    │           └── system.md                    # 系统提示词
    └── test/
        └── java/com/example/codereview/
            ├── tool/
            │   ├── GitOperationsTest.java
            │   └── GhOperationsTest.java
            └── service/
                └── CodeReviewServiceTest.java
```

---

## 7. API 设计

### 7.1 REST API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/review` | 执行代码审查 |
| POST | `/api/v1/review/stream` | 流式审查响应 (SSE) |
| GET | `/api/v1/review/tools` | 列出可用工具 |
| DELETE | `/api/v1/review/session/{id}` | 清除会话 |

### 7.2 请求/响应格式

**审查请求：**
```json
{
  "message": "帮我 review 当前 branch 新代码",
  "sessionId": "optional-session-id",
  "workingDirectory": "/path/to/repo"
}
```

**审查响应：**
```json
{
  "sessionId": "session-uuid",
  "events": [
    {
      "type": "tool_call",
      "toolName": "gitCommand",
      "arguments": {...}
    },
    {
      "type": "tool_result",
      "result": "..."
    },
    {
      "type": "text",
      "content": "## Summary\n..."
    },
    {
      "type": "complete",
      "usage": {"inputTokens": 1000, "outputTokens": 500}
    }
  ]
}
```

---

## 8. 关键实现细节

### 8.1 GitOperations 实现

```java
@Component
@Slf4j
public class GitOperations {

    private final Path workingDirectory;

    public String execute(GitOperationType operation, Map<String, String> params) {
        List<String> command = buildCommand(operation, params);
        return executeCommand(command);
    }

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
                if (hash == null) throw new IllegalArgumentException("commitHash required");
                yield List.of("git", "show", hash);
            }
            // ... 其他操作
        };
    }

    private String executeCommand(List<String> command) {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workingDirectory.toFile());
        pb.redirectErrorStream(true);
        // ... 执行并返回结果
    }
}
```

### 8.2 GhOperations 实现

```java
@Component
@Slf4j
public class GhOperations {

    public String execute(GhOperationType operation, Map<String, String> params) {
        // 首先检查 gh CLI 是否可用
        if (!isGhAvailable()) {
            return "Error: GitHub CLI (gh) is not installed or not available in PATH";
        }

        return switch (operation) {
            case PR_VIEW -> {
                String number = params.get("prNumber");
                yield executeCommand("gh", "pr", "view", number);
            }
            case PR_DIFF -> {
                String number = params.get("prNumber");
                yield executeCommand("gh", "pr", "diff", number);
            }
            // ... 其他操作
        };
    }

    private boolean isGhAvailable() {
        try {
            executeCommand("gh", "--version");
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
```

### 8.3 工具注册

```java
@Configuration
public class ToolConfig {

    @Bean
    @Description("执行 Git 命令获取代码变更信息")
    public Function<GitCommandRequest, String> gitCommand(GitOperations gitOps) {
        return request -> gitOps.execute(request.operation(), request.params());
    }

    @Bean
    @Description("执行 GitHub CLI 命令获取 Pull Request 信息")
    public Function<GhCommandRequest, String> ghCommand(GhOperations ghOps) {
        return request -> ghOps.execute(request.operation(), request.params());
    }

    @Bean
    @Primary
    public ToolCallbackProvider codeReviewToolCallbackProvider(
            Function<GitCommandRequest, String> gitCommand,
            Function<GhCommandRequest, String> ghCommand,
            Function<ReadFileRequest, String> readFile,
            Function<WriteFileRequest, String> writeFile) {

        return () -> new ToolCallback[] {
            FunctionToolCallback.builder("gitCommand", gitCommand)
                .description("执行 Git 命令获取代码变更")
                .inputType(GitCommandRequest.class)
                .build(),
            FunctionToolCallback.builder("ghCommand", ghCommand)
                .description("执行 GitHub CLI 命令")
                .inputType(GhCommandRequest.class)
                .build(),
            FunctionToolCallback.builder("readFile", readFile)
                .description("读取文件内容")
                .inputType(ReadFileRequest.class)
                .build(),
            FunctionToolCallback.builder("writeFile", writeFile)
                .description("写入文件内容")
                .inputType(WriteFileRequest.class)
                .build()
        };
    }
}
```

---

## 9. 安全考虑

### 9.1 命令执行安全

| 安全措施 | 描述 |
|----------|------|
| 白名单命令 | 只允许预定义的 git/gh 命令 |
| 路径限制 | 文件操作限制在工作目录内 |
| 超时控制 | 命令执行设置超时（默认 30s） |
| 输出限制 | 限制命令输出大小（默认 1MB） |

### 9.2 敏感信息保护

- 不记录完整的 diff 内容到日志
- 过滤潜在的敏感文件（.env, credentials 等）
- 不在响应中暴露完整路径

---

## 10. 测试策略

### 10.1 单元测试

| 测试类 | 测试内容 |
|--------|----------|
| `GitOperationsTest` | 各 Git 操作的命令构建和执行 |
| `GhOperationsTest` | GitHub CLI 命令执行 |
| `CodeReviewServiceTest` | 服务层逻辑 |

### 10.2 集成测试

- 使用临时 Git 仓库测试完整审查流程
- Mock LLM 响应测试工具调用链

### 10.3 端到端测试

```bash
# 测试分支差异审查
curl -X POST http://localhost:8080/api/v1/review \
  -H "Content-Type: application/json" \
  -d '{"message": "review 当前分支新代码"}'

# 测试 PR 审查
curl -X POST http://localhost:8080/api/v1/review \
  -H "Content-Type: application/json" \
  -d '{"message": "review PR 12"}'
```

---

## 11. 配置参考

```yaml
# application.yml
codereview:
  # 模型配置
  default-model: claude-sonnet-4-6
  temperature: 0.7
  max-tokens: 4096
  max-steps: 200

  # 系统提示词
  system-prompt: classpath:prompts/system.md

  # 工具配置
  git:
    timeout-seconds: 30
    max-output-bytes: 1048576  # 1MB
  gh:
    timeout-seconds: 30

  # 安全配置
  allowed-paths:
    - ${user.dir}  # 当前工作目录

spring:
  application:
    name: codereview-agent
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      base-url: ${OPENAI_BASE_URL:https://api.openai.com}
    chat:
      memory:
        enabled: true
        type: in_memory
```

---

## 12. 实现优先级

| 优先级 | 任务 | 预估工时 |
|--------|------|----------|
| P0 | 项目骨架搭建，复制 simple-agent 结构 | 1h |
| P0 | GitOperations 实现（核心 diff 操作） | 2h |
| P0 | 系统提示词集成（system.md） | 0.5h |
| P1 | GhOperations 实现 | 1h |
| P1 | 工具注册和 ChatClient 集成 | 1h |
| P1 | REST API 端点 | 1h |
| P2 | 错误处理和日志 | 1h |
| P2 | 单元测试 | 2h |
| P3 | 文档和示例 | 1h |

**总计：约 10.5 小时**

---

## 13. 扩展方向

### 13.1 未来增强

- **MCP 集成**: 通过 MCP 接入更多代码分析工具
- **规则定制**: 支持项目级别的审查规则配置
- **报告导出**: 支持导出 Markdown/HTML 审查报告
- **CI/CD 集成**: 作为 PR 检查步骤运行
- **多仓库支持**: 同时审查多个相关仓库

### 13.2 可配置规则

```yaml
codereview:
  rules:
    - name: "no-system-out"
      pattern: "System\\.out\\.println"
      severity: LOW
      message: "Use logging instead of System.out"

    - name: "sql-injection-check"
      pattern: "executeQuery\\(.*\\+"
      severity: CRITICAL
      message: "Potential SQL injection"
```

---

## 附录 A: 命令速查表

### Git 命令

```bash
# 未暂存改动
git diff

# 已暂存改动
git diff --cached

# 与 main 分支的差异
git diff main...HEAD

# 某提交的改动
git show abc123

# 提交范围
git diff abc123..HEAD
git diff abc123..def456

# 当前状态
git status --short

# 变更的文件列表
git diff --name-only main...HEAD
```

### GitHub CLI 命令

```bash
# 查看 PR
gh pr view 12

# PR 代码差异
gh pr diff 12

# PR 变更文件
gh pr diff 12 --name-only

# 列出 PR
gh pr list --state open
```

---

## 附录 B: 审查输出示例

```markdown
## Summary

本次审查涉及 3 个文件的改动，主要是在用户认证模块添加了双因素认证功能。

## Issues Found

### Medium: 潜在的空指针异常
- **File**: `src/main/java/com/example/auth/AuthService.java:45`
- **Description**: `user.getTwoFactorSecret()` 可能为 null，直接调用方法会导致 NPE
- **Scenario**: 用户未启用双因素认证时调用此方法
- **Fix**: 添加 null 检查或使用 Optional

```java
// 当前代码
String secret = user.getTwoFactorSecret().toString();

// 建议修改
String secret = Optional.ofNullable(user.getTwoFactorSecret())
    .map(Object::toString)
    .orElse("");
```

### Low: 日志级别建议
- **File**: `src/main/java/com/example/auth/AuthController.java:23`
- **Description**: 认证失败使用 `info` 级别可能不利于问题排查
- **Fix**: 建议使用 `warn` 或 `debug` 级别

## Suggestions

- 考虑为 `TwoFactorService` 添加单元测试
- `application.yml` 中的密钥配置建议使用环境变量

## Verification

1. 运行 `mvn test` 确保所有测试通过
2. 手动测试用户启用/禁用双因素认证的流程
3. 验证认证失败时的日志输出
```
