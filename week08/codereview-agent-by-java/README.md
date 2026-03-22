# yy-codereview

智能代码审查 CLI 工具，在任意 Git 项目目录下运行代码审查。

## 快速开始

### 配置 API Key

```bash
# Linux/macOS
export AI_API_KEY=your-api-key

# Windows
set AI_API_KEY=your-api-key
```

### 安装 (可选)

**Linux/macOS:**
```bash
cd week08/codereview-agent-by-java
./install.sh
```

**Windows:**
```cmd
cd week08\codereview-agent-by-java
install.bat
# 重启终端使 PATH 生效
```

## 使用方式

### 1. 单次审查

```bash
cd /path/to/your-project

# 审查当前分支新代码
yy-codereview "review current branch"

# 审查未提交的改动
yy-codereview "review uncommitted changes"

# 审查最近的提交
yy-codereview "review last commit"

# 审查特定提交
yy-codereview "review commit abc123"

# 审查 PR (需要安装 gh CLI)
yy-codereview "review PR 12"
```

### 2. 交互模式

```bash
cd /path/to/your-project

# 无参数启动进入交互模式
yy-codereview

# 或明确指定交互模式
yy-codereview -i
yy-codereview --interactive
```

**交互模式示例：**
```
$ yy-codereview

══════════════════════════════════════════════════
  Code Review Agent - Interactive Mode
══════════════════════════════════════════════════

  Working directory: /path/to/your-project
  Type 'exit' or 'quit' to exit
  Type 'help' for available commands

> review current branch
(AI 输出审查结果...)

> can you explain the security issue in more detail?
(AI 回答...)

> write the review report to review.md
(AI 写入报告...)

> exit
Goodbye!
```

### 3. Web API 模式

```bash
# 启动 Web 服务 (端口 8080)
yy-codereview --server

# API 端点
POST /api/v1/review           # 同步审查
POST /api/v1/review/stream    # 流式审查 (SSE)
GET  /api/v1/review/tools     # 工具列表
```

## 命令行选项

| 选项 | 说明 |
|------|------|
| `-i, --interactive` | 启动交互模式 |
| `-v, --verbose` | 显示详细日志 (调试用) |
| `--server` | 启动 Web API 服务 |
| `-h, --help` | 显示帮助信息 |

```bash
# 显示详细日志 (调试用)
yy-codereview -v "review current branch"
```

## 模式对比

| 模式 | 命令 | 用途 |
|------|------|------|
| **单次审查** | `yy-codereview "message"` | 执行一次审查后退出 |
| **交互模式** | `yy-codereview` 或 `yy-codereview -i` | 持续对话，多轮审查 |
| **Web API** | `yy-codereview --server` | 提供 REST API 服务 |

## 示例输出

```
Working directory: /path/to/your-project
Review request: review current branch

📝 Review Result:
────────────────────────────────────────

## Summary
本次审查涉及 3 个文件的改动，主要是在用户认证模块添加了双因素认证功能。

## Issues Found

### Medium: 潜在的空指针异常
- **File**: `src/main/java/com/example/auth/AuthService.java:45`
- **Description**: `user.getTwoFactorSecret()` 可能为 null
- **Fix**: 添加 null 检查

## Suggestions
- 考虑添加单元测试
- 密钥配置建议使用环境变量

────────────────────────────────────────────────────────
Completed in 12.3 seconds
```

## 支持的审查类型

| 输入 | 审查类型 |
|------|----------|
| 无参数 | 进入交互模式 |
| "当前改动" / "未提交" | 未提交改动 |
| "当前分支" / "和 X 的差异" | 分支差异 |
| 提交哈希 / "commit X" | 提交审查 |
| "PR X" / "pull request X" | PR 审查 |
| "X 之后" / "从 X 到 Y" | 提交范围 |

## 不安装直接运行

```bash
# Linux/macOS
./yy-codereview "review current branch"
./yy-codereview                    # 交互模式

# Windows
yy-codereview.bat "review current branch"
yy-codereview.bat                  # 交互模式
```

## 环境要求

- Java 17+
- Git
- API Key (DeepSeek / OpenAI)

## License

MIT
