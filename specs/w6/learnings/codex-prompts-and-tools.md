# Codex System Prompt 与工具调用系统详解

> 本文档分析 OpenAI Codex CLI 的 System Prompt 架构和工具调用系统，探索其设计理念和实现细节。

## 1. 概述

### 1.1 项目简介

Codex 是 OpenAI 开源的命令行 AI 编码助手，使用 Rust 编写。它提供了一个终端-based 的编码助手，能够：

- 接收用户提示和工作区上下文
- 通过流式思考和响应与用户通信
- 发出函数调用来运行终端命令和应用补丁

### 1.2 Prompt 系统设计理念

Codex 的 Prompt 系统遵循以下设计原则：

1. **分层架构** - 不同类型的指令在不同层级注入
2. **模块化** - 各组件独立可配置
3. **动态注入** - 运行时根据状态变化增量更新
4. **优先级控制** - 明确的指令覆盖规则

---

## 2. System Prompt 架构

### 2.1 多层次 Prompt 系统

```
┌─────────────────────────────────────────────────────────────┐
│                   LLM Context Window                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │              BaseInstructions              │
        │        (模型基础身份和能力定义)             │
        │                                           │
        │  • Agent 身份定义                          │
        │  • 核心行为准则                            │
        │  • 工作方式说明                            │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │          DeveloperInstructions            │
        │         (运行时动态注入的配置)              │
        │                                           │
        │  • 权限策略 (approval_policy)             │
        │  • 协作模式 (collaboration_mode)          │
        │  • 个性化设置 (personality)               │
        │  • 模型特定指令 (model_instructions)      │
        │  • 实时对话状态 (realtime_status)         │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │            UserInstructions               │
        │         (来自 AGENTS.md 的用户指导)        │
        │                                           │
        │  • 目录作用域                              │
        │  • 嵌套优先级                              │
        │  • 编码约定                                │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │           SkillInstructions               │
        │          (可用技能列表和使用指南)           │
        │                                           │
        │  • 技能发现规则                            │
        │  • 触发条件                                │
        │  • 使用方式                                │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │          EnvironmentContext               │
        │          (环境上下文和配置)                │
        │                                           │
        │  • Shell 环境                              │
        │  • 文件系统权限                            │
        │  • 网络访问配置                            │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │          Conversation History             │
        │            (历史对话上下文)                │
        │                                           │
        │  • 用户消息                                │
        │  • 工具调用                                │
        │  • 响应内容                                │
        └───────────────────────────────────────────┘
```

### 2.2 各层职责说明

| 层级 | 结构体 | 来源 | 职责 |
|-----|--------|------|------|
| BaseInstructions | `BaseInstructions` | 模型配置文件 | 定义 Agent 的基本身份和能力 |
| DeveloperInstructions | `DeveloperInstructions` | 运行时动态生成 | 权限、模式、个性化等配置 |
| UserInstructions | `UserInstructions` | AGENTS.md 文件 | 用户自定义的编码指导 |
| SkillInstructions | `SkillInstructions` | Skills 目录 | 可用技能的描述和使用规则 |
| EnvironmentContext | 环境变量 | 系统环境 | Shell、文件系统、网络配置 |

### 2.3 动态注入机制

Prompt 的动态注入通过 `context_manager/updates.rs` 实现：

```
状态变化事件
     │
     ▼
┌────────────────────────────────┐
│  build_settings_update_items() │
└────────────────────────────────┘
     │
     ├──► 模型切换 ──► build_model_instructions_update_item()
     │
     ├──► 权限变化 ──► build_permissions_update_item()
     │
     ├──► 模式切换 ──► build_collaboration_mode_update_item()
     │
     ├──► 实时状态 ──► build_realtime_update_item()
     │
     └──► 个性化 ──► build_personality_update_item()
     │
     ▼
生成 ResponseItem 注入到对话上下文
```

---

## 3. 核心 Prompt 文件详解

### 3.1 prompt.md - 基础系统提示词

**文件路径**: `codex-rs/core/prompt.md`

这是 Codex 的核心系统提示词，定义了 Agent 的基本行为：

```markdown
You are a coding agent running in the Codex CLI, a terminal-based coding
assistant. Codex CLI is an open source project led by OpenAI. You are
expected to be precise, safe, and helpful.

Your capabilities:
- Receive user prompts and other context provided by the harness
- Communicate with the user by streaming thinking & responses
- Emit function calls to run terminal commands and apply patches
```

**主要章节**:

| 章节 | 内容 |
|-----|------|
| Personality | 定义简洁、直接、友好的沟通风格 |
| AGENTS.md spec | 处理用户自定义指令的规则 |
| Responsiveness | 工具调用前的前言消息规则 |
| Planning | `update_plan` 工具的使用指南 |
| Task execution | 任务执行的核心准则 |
| Validating your work | 测试和验证工作的方法 |
| Tool Guidelines | Shell 命令和工具使用指南 |

### 3.2 orchestrator.md - Agent 编排器

**文件路径**: `codex-rs/core/templates/agents/orchestrator.md`

编排器提示词用于多 Agent 协作场景：

```markdown
You are Codex, a coding agent based on GPT-5. You and the user share
the same workspace and collaborate to achieve the user's goals.

# Sub-agents
## Core rule
Sub-agents are there to make you go fast and time is a big constraint
so leverage them smartly as much as you can.

## Flow
1. Understand the task.
2. Spawn the optimal necessary sub-agents.
3. Coordinate them via wait / send_input.
4. Iterate on this process.
```

**子 Agent 协作流程**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Orchestrator Agent                       │
│                                                              │
│  1. 理解任务 ──► 2. 生成子Agent ──► 3. 协调执行 ──► 4. 迭代  │
└─────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ Agent 1 │     │ Agent 2 │     │ Agent 3 │
    │ (探索)   │     │ (编码)   │     │ (测试)   │
    └─────────┘     └─────────┘     └─────────┘
```

### 3.3 协作模式 Prompt

Codex 支持多种协作模式，每种模式有独立的 Prompt：

#### 3.3.1 Plan 模式

**文件路径**: `codex-rs/core/templates/collaboration_mode/plan.md`

Plan 模式采用三阶段规划方法：

```
┌─────────────────────────────────────────────────────────────┐
│                      PLAN MODE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: 环境基础 (Explore first, ask second)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 执行非变异探索操作                                  │   │
│  │ • 读取文件、搜索代码、检查配置                        │   │
│  │ • 在询问用户前完成所有可通过探索解决的问题            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  PHASE 2: 意图对话 (What they actually want)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 明确目标 + 成功标准                                 │   │
│  │ • 确定范围 (in/out of scope)                         │   │
│  │ • 理解约束和偏好                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  PHASE 3: 实现对话 (What/how we'll build)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 确定实现方法                                        │   │
│  │ • 设计接口 (APIs/schemas/I/O)                        │   │
│  │ • 规划测试和验收标准                                  │   │
│  │ • 生成 <proposed_plan> 块                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**关键规则**:
- Plan 模式下只能执行非变异操作
- 必须通过探索解决可发现的事实问题
- 只有无法通过探索解决的问题才询问用户
- 最终计划使用 `<proposed_plan>` 标签包裹

#### 3.3.2 其他协作模式

| 模式 | 文件 | 描述 |
|-----|------|------|
| Default | `default.md` | 默认执行模式，直接响应用户请求 |
| Execute | `execute.md` | 专注执行模式，快速完成任务 |
| Pair Programming | `pair_programming.md` | 结对编程模式，协作式开发 |

---

## 4. 工具调用系统

### 4.1 工具定义 Schema

Codex 使用 OpenAI Responses API 的工具定义格式：

```rust
// 工具规格定义 (spec.rs)
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(tag = "type")]
pub enum ToolSpec {
    #[serde(rename = "function")]
    Function(ResponsesApiTool),

    #[serde(rename = "local_shell")]
    LocalShell {},

    #[serde(rename = "web_search")]
    WebSearch { external_web_access: Option<bool> },

    #[serde(rename = "custom")]
    Freeform(FreeformTool),
}

// 函数工具定义
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ResponsesApiTool {
    pub name: String,
    pub description: String,
    pub strict: bool,
    pub parameters: JsonSchema,
}
```

### 4.2 工具类型分类

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Types                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Function Tools (JSON Schema)            │   │
│  │                                                      │   │
│  │  • shell        - 执行 shell 命令                    │   │
│  │  • update_plan  - 更新任务计划                       │   │
│  │  • spawn_agent  - 生成子 Agent                       │   │
│  │  • view_image   - 查看图片                           │   │
│  │  • request_user_input - 请求用户输入                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Freeform Tools (Custom Syntax)          │   │
│  │                                                      │   │
│  │  • apply_patch  - 使用自定义 diff 格式编辑文件       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  MCP Tools (Dynamic)                 │   │
│  │                                                      │   │
│  │  • 动态加载的外部工具                                 │   │
│  │  • 通过 Model Context Protocol 接入                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 核心工具详解

#### 4.3.1 Shell 工具

```rust
ToolSpec::Function(ResponsesApiTool {
    name: "shell".to_string(),
    description: "Runs a shell command and returns its output.
    - The arguments to `shell` will be passed to execvp().
    - Most terminal commands should be prefixed with [\"bash\", \"-lc\"].",
    strict: false,
    parameters: JsonSchema::Object {
        properties: BTreeMap::from([
            ("command", JsonSchema::Array {
                items: Box::new(JsonSchema::String { description: None }),
                description: Some("The command to execute".to_string()),
            }),
            ("workdir", JsonSchema::String {
                description: Some("The working directory".to_string()),
            }),
            ("timeout_ms", JsonSchema::Number {
                description: Some("The timeout in milliseconds".to_string()),
            }),
            ("sandbox_permissions", JsonSchema::String {
                description: Some("Sandbox permissions...".to_string()),
            }),
        ]),
        required: Some(vec!["command".to_string()]),
    },
})
```

#### 4.3.2 Update Plan 工具

```rust
ToolSpec::Function(ResponsesApiTool {
    name: "update_plan".to_string(),
    description: "Updates the task plan.
    Provide an optional explanation and a list of plan items.",
    parameters: JsonSchema::Object {
        properties: BTreeMap::from([
            ("explanation", JsonSchema::String { description: None }),
            ("plan", JsonSchema::Array {
                items: Box::new(JsonSchema::Object {
                    properties: BTreeMap::from([
                        ("step", JsonSchema::String { description: None }),
                        ("status", JsonSchema::String {
                            description: Some("One of: pending, in_progress, completed".to_string()),
                        }),
                    ]),
                    required: Some(vec!["step".to_string(), "status".to_string()]),
                }),
            }),
        ]),
        required: Some(vec!["plan".to_string()]),
    },
})
```

#### 4.3.3 Apply Patch 工具 (Freeform)

Apply Patch 使用自定义的 diff 格式：

```
*** Begin Patch
[ one or more file sections ]
*** End Patch

File Operations:
*** Add File: <path>     - 创建新文件
*** Delete File: <path>  - 删除文件
*** Update File: <path>  - 更新文件

Hunk Format:
@@ [header]
[context lines]
- [old code]
+ [new code]
[context lines]

Example:
*** Begin Patch
*** Add File: hello.txt
+Hello world
*** Update File: src/app.py
@@ def greet():
-print("Hi")
+print("Hello, world!")
*** Delete File: obsolete.txt
*** End Patch
```

### 4.4 工具调用流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Call Flow                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. LLM 生成工具调用 (ResponseItem::FunctionCall)           │
│     { name: "shell", arguments: "{...}", call_id: "..." }   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Router 解析和路由 (router.rs)                           │
│     build_tool_call() → ToolCall                            │
│     - 判断工具类型 (Function/MCP/Custom/LocalShell)         │
│     - 构建 ToolPayload                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 权限检查 (Policy Gates)                                 │
│     - 检查沙箱权限                                           │
│     - 检查审批策略                                           │
│     - 必要时请求用户批准                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Handler 执行 (handlers/)                                │
│     dispatch_tool_call() → ToolInvocation                   │
│     - ShellHandler / ApplyPatchHandler / McpHandler / ...   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 结果格式化 (mod.rs)                                     │
│     format_exec_output_for_model_structured()               │
│     format_exec_output_for_model_freeform()                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. 返回结果给 LLM (ResponseInputItem::FunctionCallOutput)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 权限控制 Prompt

### 5.1 审批策略

Codex 支持多种审批策略，每种策略有对应的 Prompt：

| 策略 | 文件 | 描述 |
|-----|------|------|
| `never` | `approval_policy/never.md` | 从不请求审批 |
| `unless_trusted` | `approval_policy/unless_trusted.md` | 除非信任否则审批 |
| `on_failure` | `approval_policy/on_failure.md` | 失败时审批 |
| `on_request_rule` | `approval_policy/on_request_rule.md` | 按规则请求审批 |

**on_request_rule 示例**:

```markdown
# Escalation Requests

Commands are run outside the sandbox if they are approved by the user,
or match an existing rule that allows it to run unrestricted.

## How to request escalation

- Provide the `sandbox_permissions` parameter with value "require_escalated"
- Include a short question in `justification` parameter
- Optionally suggest a `prefix_rule` for future sessions

## When to request escalation

- Commands that write to directories requiring elevated access
- GUI apps (open/xdg-open/osascript)
- Network operations blocked by sandbox
- Potentially destructive actions (rm, git reset)
```

### 5.2 沙箱模式

| 模式 | 文件 | 描述 |
|-----|------|------|
| `danger_full_access` | `sandbox_mode/danger_full_access.md` | 完全访问（危险） |
| `workspace_write` | `sandbox_mode/workspace_write.md` | 工作区写入 |
| `read_only` | `sandbox_mode/read_only.md` | 只读模式 |

### 5.3 权限升级机制

```
┌─────────────────────────────────────────────────────────────┐
│                   Permission Escalation                      │
└─────────────────────────────────────────────────────────────┘

SandboxPermissions 枚举:
┌─────────────────────────────────────────────────────────────┐
│  UseDefault              - 使用配置的沙箱设置                │
│  RequireEscalated        - 请求完全跳出沙箱                  │
│  WithAdditionalPermissions - 请求额外权限但仍保持沙箱        │
└─────────────────────────────────────────────────────────────┘

升级请求参数:
{
  "sandbox_permissions": "require_escalated",
  "justification": "Do you want to download dependencies?",
  "prefix_rule": ["npm", "install"]  // 可选：为未来会话保存规则
}
```

---

## 6. AGENTS.md 指令系统

### 6.1 文件作用域

```
project/
├── AGENTS.md          ← 作用域: 整个项目
├── src/
│   ├── AGENTS.md      ← 作用域: src/ 及其子目录 (优先级更高)
│   ├── components/
│   │   └── AGENTS.md  ← 作用域: components/ 及其子目录 (最高优先级)
│   │   └── Button.tsx
│   └── utils/
│       └── helpers.ts
└── tests/
    └── test.ts
```

### 6.2 优先级规则

```
优先级 (从高到低):

1. 直接系统/开发者/用户指令 (prompt 中的指令)
         │
         ▼
2. 更深层嵌套的 AGENTS.md 文件
         │
         ▼
3. 较浅层的 AGENTS.md 文件
         │
         ▼
4. 本地文件约定
```

### 6.3 序列化格式

AGENTS.md 内容通过 XML 标签注入到上下文：

```xml
<user_instructions>
Directory: /path/to/directory

<INSTRUCTIONS>
[AGENTS.md 文件内容]
</INSTRUCTIONS>
</user_instructions>
```

---

## 7. Skills 系统

### 7.1 技能发现和触发

Skills 通过 `render_skills_section()` 渲染到上下文：

```xml
<skill>
<name>demo-skill</name>
<path>skills/demo/SKILL.md</path>
[技能内容]
</skill>
```

### 7.2 使用规则

Skills 系统定义了以下规则：

1. **发现规则**: 扫描配置目录中的 SKILL.md 文件
2. **触发规则**: 通过 `/skill-name` 或关键词触发
3. **缺失处理**: 如果技能不可用，提示用户
4. **协调排序**: 多技能协作时的优先级
5. **上下文卫生**: 避免重复加载

---

## 8. 设计启示

### 8.1 可借鉴的设计模式

#### 8.1.1 分层 Prompt 架构

```
优点:
✓ 清晰的关注点分离
✓ 易于维护和扩展
✓ 支持动态更新
✓ 明确的优先级规则
```

#### 8.1.2 动态注入机制

```
优点:
✓ 按需更新，减少 token 消耗
✓ 状态变化时自动同步
✓ 支持运行时配置变更
```

#### 8.1.3 工具抽象

```
优点:
✓ 统一的工具接口
✓ 支持多种工具类型
✓ 易于扩展新工具
✓ 完善的权限控制
```

### 8.2 与其他项目的对比

| 特性 | Codex | Claude Code | Cursor |
|-----|-------|-------------|--------|
| Prompt 架构 | 多层动态注入 | 类似多层结构 | 集中式 |
| 工具定义 | OpenAI 格式 | Anthropic 格式 | 自定义 |
| 协作模式 | 多模式切换 | Plan 模式 | Agent 模式 |
| 权限控制 | 细粒度策略 | 审批机制 | 沙箱 |

### 8.3 核心代码结构

```
codex-rs/
├── core/
│   ├── prompt.md              # 核心系统提示词
│   ├── src/
│   │   ├── tools/
│   │   │   ├── spec.rs        # 工具规格定义
│   │   │   ├── registry.rs    # 工具注册表
│   │   │   ├── router.rs      # 工具路由
│   │   │   └── handlers/      # 工具处理器
│   │   ├── context_manager/
│   │   │   └── updates.rs     # Prompt 更新逻辑
│   │   └── skills/
│   │       └── render.rs      # Skills 渲染
│   └── templates/
│       ├── agents/            # Agent 相关模板
│       ├── collaboration_mode/ # 协作模式模板
│       └── personalities/     # 个性化模板
├── protocol/
│   └── src/
│       ├── models.rs          # 数据结构定义
│       ├── protocol.rs        # 协议常量
│       └── prompts/           # Prompt 片段
│           ├── base_instructions/
│           ├── permissions/
│           └── realtime/
└── apply-patch/
    └── apply_patch_tool_instructions.md
```

---

## 9. 总结

Codex 的 Prompt 和工具调用系统体现了现代 AI 编码助手的设计最佳实践：

1. **模块化设计** - 各组件职责清晰，易于维护
2. **动态配置** - 支持运行时灵活调整
3. **安全优先** - 细粒度的权限控制
4. **用户友好** - AGENTS.md 让用户可以自定义行为
5. **可扩展性** - Skills 和 MCP 支持功能扩展

这些设计模式对于构建类似的 AI 编码工具具有重要的参考价值。
