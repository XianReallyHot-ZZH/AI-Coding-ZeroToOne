# yy-codereview

智能代码审查 CLI 工具，在任意 Git 项目目录下运行代码审查。

## 快速开始

### 安装

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

### 配置 API Key

```bash
# Linux/macOS
export AI_API_KEY=your-api-key

# Windows
set AI_API_KEY=your-api-key
```

### 使用

```bash
# 进入你的项目目录
cd /path/to/your-project

# 审查当前分支新代码
yy-codereview "review current branch"

# 审查未提交的改动
yy-codereview "review uncommitted changes"

# 审查最近的提交
yy-codereview "review last commit"

# 审查特定提交
yy-codereview "review commit abc123"

# 审查 PR
yy-codereview "review PR 12"
```

## 示例输出

```
============================================================
Code Review Result
============================================================

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

============================================================
Completed in 12.3 seconds
============================================================
```

## 不安装直接运行

```bash
# Linux/macOS
./yy-codereview "review current branch"

# Windows
yy-codereview.bat "review current branch"
```

## Web API 模式

```bash
# 启动 Web 服务 (端口 8080)
yy-codereview --server

# API 端点
POST /api/v1/review           # 同步审查
POST /api/v1/review/stream    # 流式审查 (SSE)
GET  /api/v1/review/tools     # 工具列表
```

## 支持的审查类型

| 输入 | 审查类型 |
|------|----------|
| 无参数 / "当前改动" / "未提交" | 未提交改动 |
| "当前分支" / "和 X 的差异" | 分支差异 |
| 提交哈希 / "commit X" | 提交审查 |
| "PR X" / "pull request X" | PR 审查 |
| "X 之后" / "从 X 到 Y" | 提交范围 |

## 环境要求

- Java 17+
- Git
- API Key (DeepSeek / OpenAI)

## License

MIT
