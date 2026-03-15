# OpenCode LLM 输入输出捕获方案

> 探索日期: 2026-03-12
> 源码位置: `./venders/opencode`

## 背景

需要在不修改 OpenCode 源码的情况下，获取每次向 LLM 发送的完整输入输出内容。

## 方案结论

OpenCode 有**完善的插件系统**，通过 Hook 机制可以捕获 LLM 的输入输出，无需修改源码。

---

## 最佳方案：插件 Hook

### 核心文件

- **插件接口定义**: `packages/plugin/src/index.ts`
- **插件示例**: `packages/plugin/src/example.ts`
- **插件加载器**: `packages/opencode/src/plugin/index.ts`

### 可用的 LLM 相关 Hooks

| Hook | 用途 | 参数 |
|------|------|------|
| `chat.params` | 获取发送到 LLM 的完整参数 | `input.sessionID`, `input.agent`, `input.model`, `output.temperature`, `output.topP`, `output.options` |
| `chat.message` | 获取用户消息和 parts | `output.message`, `output.parts` |
| `chat.headers` | 修改/查看 HTTP 请求头 | `output.headers` |
| `experimental.text.complete` | 获取 AI 响应的完整文本 | `output.text` |
| `experimental.chat.system.transform` | 转换 system 提示 | `output.system` |
| `experimental.chat.messages.transform` | 转换消息历史 | `output.messages` |
| `event` | 监听所有事件（包括流式） | `event.type`, `event.properties` |

### 插件示例代码

```typescript
// llm-logger-plugin.ts
import { Plugin } from "@opencode-ai/plugin"

export const LLMLoggerPlugin: Plugin = async (ctx) => {
  return {
    // 方式1: 监听所有事件（最全面）
    event: async ({ event }) => {
      // 关键事件类型:
      // - session.message.created
      // - session.part.updated
      // - session.part.delta (流式增量)
      console.log(`[${event.type}]`, JSON.stringify(event.properties, null, 2))
    },

    // 方式2: 捕获请求参数
    "chat.params": async (input, output) => {
      console.log("LLM Request:", {
        sessionID: input.sessionID,
        agent: input.agent,
        model: input.model,
        params: output,
      })
    },

    // 方式3: 捕获完整响应
    "experimental.text.complete": async (input, output) => {
      console.log("LLM Response:", output.text)
    },
  }
}

export default LLMLoggerPlugin
```

### 安装插件

在 `opencode.json` 中配置：

```json
{
  "plugin": ["./llm-logger-plugin.ts"]
}
```

或通过环境变量：

```bash
OPENCODE_CONFIG_CONTENT='{"plugin":["./llm-logger-plugin.ts"]}' opencode
```

---

## 备选方案

### 1. DEBUG 日志

最简单的方式，只需设置日志级别：

```bash
opencode --logLevel DEBUG --print-logs
```

或在配置文件中：

```json
{
  "logLevel": "DEBUG"
}
```

日志文件位置: `~/.local/share/opencode/log/<timestamp>.log`

### 2. OpenTelemetry

启用后 Vercel AI SDK 会发送遥测数据：

```json
{
  "experimental": {
    "openTelemetry": true
  }
}
```

需要配置 OpenTelemetry 后端收集数据。

### 3. SQLite 数据库

直接查询存储的会话数据：

- 位置: `~/.local/share/opencode/state/<project-id>/opencode.db`
- 表: `session`, `message`, `part`

```bash
sqlite3 ~/.local/share/opencode/state/<project-id>/opencode.db \
  "SELECT * FROM message JOIN part ON message.id = part.messageId"
```

---

## 推荐组合

1. **开发调试**: 使用 `--logLevel DEBUG` 快速查看
2. **生产监控**: 使用插件系统 + 自定义日志/存储
3. **历史回溯**: 查询 SQLite 数据库

---

## 相关源码路径

```
venders/opencode/
├── packages/
│   ├── plugin/
│   │   └── src/
│   │       ├── index.ts      # Hook 接口定义
│   │       └── example.ts    # 插件示例
│   ├── opencode/
│   │   └── src/
│   │       ├── session/
│   │       │   ├── llm.ts        # LLM 调用核心 (streamText)
│   │       │   └── processor.ts  # 会话处理器
│   │       ├── plugin/
│   │       │   └── index.ts      # 插件加载器
│   │       ├── util/
│   │       │   └── log.ts        # 日志系统
│   │       └── config/
│   │           └── config.ts     # 配置系统
│   └── sdk/
│       └── src/
│           └── index.ts      # SDK
```
