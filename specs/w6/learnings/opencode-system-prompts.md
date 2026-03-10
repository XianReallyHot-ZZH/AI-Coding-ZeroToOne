# OpenCode System Prompts 与工具调用机制深度解析

> 基于 OpenCode 源码的深度分析，探索一个现代化 AI Coding Agent 的系统提示设计与工具调用架构。

## 目录

1. [项目架构概览](#1-项目架构概览)
2. [System Prompt 体系](#2-system-prompt-体系)
3. [工具调用架构](#3-工具调用架构)
4. [Agent 系统](#4-agent-系统)
5. [LLM 交互流程](#5-llm-交互流程)
6. [关键设计模式](#6-关键设计模式)

---

## 1. 项目架构概览

### 1.1 整体结构

```
packages/
├── opencode/          # 核心主包 - CLI Agent 实现
│   └── src/
│       ├── session/   # 会话管理 & Prompt 系统
│       ├── tool/      # 工具定义与注册
│       ├── agent/     # Agent 配置与管理
│       └── provider/  # 多模型提供商适配
├── sdk/               # JavaScript SDK
├── app/               # Web 应用
├── desktop/           # 桌面应用
└── ui/               # UI 组件库
```

### 1.2 核心模块交互图

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI / App Entry                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Session Manager                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Prompt    │  │   Message   │  │      Processor          │  │
│  │  Resolver   │  │   Manager   │  │  (Tool Call Handler)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   System Prompt │ │    Tool         │ │     Agent       │
│     System      │ │    Registry     │ │    Manager      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Stream Layer                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  streamText() - AI SDK Integration with Provider Transform │  │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Adapters                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Claude │ │OpenAI  │ │ Gemini │ │ Qwen   │ │Trinity │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. System Prompt 体系

### 2.1 Prompt 文件组织

OpenCode 采用**分层 Prompt 策略**，根据不同的模型提供商定制系统提示：

```
packages/opencode/src/session/prompt/
├── codex_header.txt   # GPT-5 / Codex 主 Prompt (最完整)
├── anthropic.txt      # Claude 专用 Prompt (带 TodoWrite)
├── beast.txt          # GPT / o1 / o3 模型专用
├── gemini.txt         # Gemini 专用 Prompt
├── qwen.txt           # Qwen / 默认 Prompt (精简版)
└── trinity.txt        # Trinity 模型专用
```

### 2.2 Prompt 选择逻辑

```typescript
// system.ts - 根据模型动态选择 Prompt
export function provider(model: Provider.Model) {
  if (model.api.id.includes("gpt-5")) return [PROMPT_CODEX]
  if (model.api.id.includes("gpt-") || model.api.id.includes("o1") || model.api.id.includes("o3"))
    return [PROMPT_BEAST]
  if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
  if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
  if (model.api.id.toLowerCase().includes("trinity")) return [PROMPT_TRINITY]
  return [PROMPT_ANTHROPIC_WITHOUT_TODO]  // 默认
}
```

### 2.3 核心 System Prompt 内容分析

#### 2.3.1 Codex Header (codex_header.txt) - 最完整版本

这是 OpenCode 最核心的系统提示，包含以下关键模块：

```
┌────────────────────────────────────────────────────────────────┐
│                    CODEX HEADER STRUCTURE                       │
├────────────────────────────────────────────────────────────────┤
│ 1. 身份定义                                                     │
│    "You are OpenCode, the best coding agent on the planet."    │
├────────────────────────────────────────────────────────────────┤
│ 2. 编辑约束 (Editing constraints)                               │
│    - 默认使用 ASCII 字符                                        │
│    - 仅在必要时添加注释                                         │
│    - 单文件编辑优先使用 apply_patch                             │
├────────────────────────────────────────────────────────────────┤
│ 3. 工具使用策略 (Tool usage)                                    │
│    - 优先使用专用工具而非 shell                                 │
│    - Read → 查看, Edit → 修改, Write → 必要时创建              │
│    - Glob → 文件查找, Grep → 内容搜索                           │
│    - Bash → 终端操作                                           │
│    - 并行调用无依赖的工具                                       │
├────────────────────────────────────────────────────────────────┤
│ 4. Git 和工作区规范 (Git hygiene)                               │
│    - 不撤销非用户创建的更改                                     │
│    - 不使用 git reset --hard 等破坏性命令                       │
│    - 不擅自 amend commits                                       │
├────────────────────────────────────────────────────────────────┤
│ 5. 前端设计指导 (Frontend tasks)                                │
│    - 避免平庸的通用布局                                         │
│    - 使用有表现力的字体                                         │
│    - 避免紫色/深色模式偏好                                      │
│    - 使用有意义的动画                                           │
├────────────────────────────────────────────────────────────────┤
│ 6. 输出格式规范 (Presenting work)                               │
│    - 简洁友好的编码队友风格                                     │
│    - 默认直接做事，不问问题                                     │
│    - 仅在真正受阻时提问                                         │
├────────────────────────────────────────────────────────────────┤
│ 7. 最终答案结构 (Final answer structure)                        │
│    - 纯文本输出，CLI 处理样式                                   │
│    - 使用 GitHub-flavored Markdown                              │
│    - 文件引用使用内联代码格式                                   │
└────────────────────────────────────────────────────────────────┘
```

#### 2.3.2 Anthropic Prompt (anthropic.txt) - Claude 专用

```markdown
关键差异点：
1. 安全性强调
   - "IMPORTANT: You must NEVER generate or guess URLs..."

2. 任务管理集成
   - 强制使用 TodoWrite 工具跟踪任务
   - 提供详细的使用示例

3. 专业客观性
   - "Prioritize technical accuracy and truthfulness..."
   - 不盲从用户，必要时诚实反对

4. 工具使用策略
   - 代码探索时优先使用 Task tool
   - 强调并行调用独立工具
```

#### 2.3.3 Beast Prompt (beast.txt) - GPT/o1/o3 专用

```markdown
关键特点：
1. 自主性强调
   - "You MUST iterate and keep going until the problem is solved."
   - "You have everything you need to resolve this problem autonomously."

2. 互联网研究强制
   - "THE PROBLEM CAN NOT BE SOLVED WITHOUT EXTENSIVE INTERNET RESEARCH."
   - 必须使用 webfetch 工具验证库/框架用法

3. 详细工作流
   - 10 步工作流程
   - 从 URL 获取到测试验证的完整闭环

4. 代码变更规范
   - 每次读取 2000 行代码
   - 主动创建 .env 文件
```

#### 2.3.4 Gemini Prompt (gemini.txt) - 精简版

```markdown
关键特点：
1. 极简输出
   - "MUST answer concisely with fewer than 4 lines"
   - 单词回答最佳

2. 代码风格
   - "IMPORTANT: DO NOT ADD ***ANY*** COMMENTS unless asked"

3. 工具使用
   - "Use exactly one tool per assistant message"
   - 串行执行，等待每个结果

4. 安全检查
   - 工作前检查文件是否可能恶意
```

#### 2.3.5 Qwen/Trinity Prompt - 超精简版

与 Gemini 类似，强调：
- 极简输出（< 4 行）
- 无注释代码
- 串行工具调用
- 拒绝恶意代码

### 2.4 动态环境信息注入

```typescript
// system.ts - 动态生成环境信息
export async function environment(model: Provider.Model) {
  return [
    `You are powered by the model named ${model.api.id}.`,
    `The exact model ID is ${model.providerID}/${model.api.id}`,
    `<env>`,
    `  Working directory: ${Instance.directory}`,
    `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
    `  Platform: ${process.platform}`,
    `  Today's date: ${new Date().toDateString()}`,
    `</env>`,
  ].join("\n")
}
```

---

## 3. 工具调用架构

### 3.1 工具定义接口

```typescript
// tool/tool.ts
export namespace Tool {
  // 工具元数据类型
  interface Metadata {
    [key: string]: any
  }

  // 工具上下文 - 传递给执行函数
  export type Context<M extends Metadata = Metadata> = {
    sessionID: string
    messageID: string
    agent: string
    abort: AbortSignal          // 用于取消操作
    callID?: string
    extra?: { [key: string]: any }
    messages: MessageV2.WithParts[]

    // 元数据更新回调
    metadata(input: { title?: string; metadata?: M }): void

    // 权限请求
    ask(input: Omit<PermissionNext.Request, "id" | "sessionID" | "tool">): Promise<void>
  }

  // 工具信息定义
  export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
    id: string
    init: (ctx?: InitContext) => Promise<{
      description: string
      parameters: Parameters
      execute(args: z.infer<Parameters>, ctx: Context): Promise<{
        title: string
        metadata: M
        output: string
        attachments?: Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">[]
      }>
      formatValidationError?(error: z.ZodError): string
    }>
  }
}
```

### 3.2 工具注册表

```
┌─────────────────────────────────────────────────────────────────┐
│                       Tool Registry                              │
├─────────────────────────────────────────────────────────────────┤
│  Core Tools:                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │    bash     │ │    read     │ │    glob     │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │    grep     │ │    edit     │ │   write     │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  Advanced Tools:                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │    task     │ │   webfetch  │ │  websearch  │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ codesearch  │ │   skill     │ │ apply_patch │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  Management Tools:                                               │
│  ┌─────────────┐ ┌─────────────┐                                 │
│  │ todowrite   │ │   invalid   │  (错误处理占位工具)             │
│  └─────────────┘ └─────────────┘                                 │
├─────────────────────────────────────────────────────────────────┤
│  Extension Sources:                                              │
│  • .opencode/tool/*.ts / .opencode/tools/*.ts                   │
│  • Plugin contributed tools                                      │
│  • MCP server tools                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 工具加载流程

```typescript
// registry.ts
async function all(): Promise<Tool.Info[]> {
  const custom = await state().then((x) => x.custom)
  const config = await Config.get()

  return [
    InvalidTool,           // 占位工具
    ...(question ? [QuestionTool] : []),
    BashTool,
    ReadTool,
    GlobTool,
    GrepTool,
    EditTool,
    WriteTool,
    TaskTool,
    WebFetchTool,
    TodoWriteTool,
    WebSearchTool,
    CodeSearchTool,
    SkillTool,
    ApplyPatchTool,
    ...(Flag.OPENCODE_EXPERIMENTAL_LSP_TOOL ? [LspTool] : []),
    ...(config.experimental?.batch_tool ? [BatchTool] : []),
    ...custom,             // 自定义工具
  ]
}
```

### 3.4 Bash 工具详解

Bash 工具是最复杂的工具之一，包含详细的 Prompt 指导：

```
┌─────────────────────────────────────────────────────────────────┐
│                      Bash Tool Structure                         │
├─────────────────────────────────────────────────────────────────┤
│  Description (bash.txt):                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • 目录验证指南                                               ││
│  │ • 命令执行规范（引用、超时）                                 ││
│  │ • 专用工具优先原则                                           ││
│  │ • 并行 vs 串行执行策略                                       ││
│  │ • Git 提交流程 (详细步骤)                                    ││
│  │ • PR 创建流程                                                ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Parameters (Zod Schema):                                        │
│  • command: string       - 要执行的命令                          │
│  • timeout: number       - 可选超时 (默认 2 分钟)                │
│  • workdir: string       - 工作目录                              │
│  • description: string   - 5-10 词描述                           │
├─────────────────────────────────────────────────────────────────┤
│  Execute Flow:                                                   │
│  1. 解析命令 (Tree-sitter Bash parser)                           │
│  2. 提取文件路径，检查外部目录权限                               │
│  3. 权限请求 (ctx.ask)                                           │
│  4. 执行命令 (spawn)                                             │
│  5. 流式更新元数据                                               │
│  6. 处理超时/中断                                                 │
│  7. 返回结果                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Task 工具（子 Agent 调用）

```typescript
// task.ts - 子任务工具定义
const parameters = z.object({
  description: z.string().describe("A short (3-5 words) description of the task"),
  prompt: z.string().describe("The task for the agent to perform"),
  subagent_type: z.string().describe("The type of specialized agent to use"),
  task_id: z.string().describe("Resume previous task ID").optional(),
})

// 执行流程：
// 1. 检查 agent 权限
// 2. 创建子 Session
// 3. 继承或创建新的权限规则
// 4. 调用 SessionPrompt.prompt() 执行子任务
// 5. 返回 task_id 和结果
```

---

## 4. Agent 系统

### 4.1 Agent 定义

```typescript
// agent/agent.ts
export const Info = z.object({
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]),  // 运行模式
  native: z.boolean().optional(),                  // 内置 vs 自定义
  hidden: z.boolean().optional(),                  // 是否在 UI 隐藏

  // 模型参数
  topP: z.number().optional(),
  temperature: z.number().optional(),

  // 模型指定
  model: z.object({
    modelID: z.string(),
    providerID: z.string(),
  }).optional(),

  variant: z.string().optional(),
  prompt: z.string().optional(),     // 自定义 system prompt
  options: z.record(z.string(), z.any()),
  steps: z.number().int().positive().optional(),

  // 权限规则集
  permission: PermissionNext.Ruleset,
})
```

### 4.2 内置 Agent 配置

```
┌─────────────────────────────────────────────────────────────────┐
│                     Built-in Agents                              │
├─────────────────────────────────────────────────────────────────┤
│  build (Primary)                                                 │
│  ├─ description: "The default agent. Executes tools based on    │
│  │                configured permissions."                       │
│  ├─ mode: primary                                                │
│  └─ permissions: 允许 question, plan_enter                       │
├─────────────────────────────────────────────────────────────────┤
│  plan (Primary)                                                  │
│  ├─ description: "Plan mode. Disallows all edit tools."         │
│  ├─ mode: primary                                                │
│  └─ permissions: 禁止 edit (除了 .opencode/plans/*.md)          │
├─────────────────────────────────────────────────────────────────┤
│  general (Subagent)                                              │
│  ├─ description: "General-purpose agent for researching         │
│  │                complex questions and executing multi-step    │
│  │                tasks."                                        │
│  ├─ mode: subagent                                               │
│  └─ permissions: 禁用 todoread, todowrite                        │
├─────────────────────────────────────────────────────────────────┤
│  explore (Subagent)                                              │
│  ├─ description: "Fast agent specialized for exploring          │
│  │                codebases."                                    │
│  ├─ mode: subagent                                               │
│  ├─ prompt: PROMPT_EXPLORE (文件搜索专家)                        │
│  └─ permissions: 仅允许 read, glob, grep, webfetch, websearch   │
├─────────────────────────────────────────────────────────────────┤
│  compaction (Hidden)                                             │
│  ├─ purpose: 上下文压缩                                          │
│  └─ permissions: 禁用所有工具                                    │
├─────────────────────────────────────────────────────────────────┤
│  title (Hidden)                                                  │
│  ├─ purpose: 生成会话标题                                        │
│  └─ temperature: 0.5                                             │
├─────────────────────────────────────────────────────────────────┤
│  summary (Hidden)                                                │
│  ├─ purpose: 生成会话摘要                                        │
│  └─ permissions: 禁用所有工具                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Explore Agent Prompt

```markdown
You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path
- Use Bash for file operations
- Adapt your search approach based on thoroughness level
- Return file paths as absolute paths
- Avoid using emojis
- Do not create any files or modify system state
```

---

## 5. LLM 交互流程

### 5.1 Stream 请求构建

```typescript
// llm.ts
export async function stream(input: StreamInput) {
  // 1. 构建 System Prompt
  const system = []
  system.push([
    // Agent 自定义 prompt 或 Provider 默认 prompt
    ...(input.agent.prompt
      ? [input.agent.prompt]
      : isCodex ? [] : SystemPrompt.provider(input.model)),
    // 自定义 prompt
    ...input.system,
    // 用户消息中的 system prompt
    ...(input.user.system ? [input.user.system] : []),
  ].filter(x => x).join("\n"))

  // 2. Plugin 转换 system
  await Plugin.trigger("experimental.chat.system.transform",
    { sessionID, model }, { system })

  // 3. 合并选项 (base + model + agent + variant)
  const options = pipe(
    base,
    mergeDeep(input.model.options),
    mergeDeep(input.agent.options),
    mergeDeep(variant),
  )

  // 4. Codex 特殊处理
  if (isCodex) {
    options.instructions = SystemPrompt.instructions()
  }

  // 5. 解析工具
  const tools = await resolveTools(input)

  // 6. 调用 AI SDK
  return streamText({
    temperature: params.temperature,
    topP: params.topP,
    topK: params.topK,
    providerOptions: ProviderTransform.providerOptions(input.model, params.options),
    activeTools: Object.keys(tools).filter(x => x !== "invalid"),
    tools,
    toolChoice: input.toolChoice,
    maxOutputTokens,
    abortSignal: input.abort,
    messages: [
      ...system.map(x => ({ role: "system", content: x })),
      ...input.messages,
    ],
    model: wrapLanguageModel({
      model: language,
      middleware: [/* message transform */],
    }),
    experimental_telemetry: { isEnabled, metadata },
  })
}
```

### 5.2 工具调用处理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                   Tool Call Processing Flow                      │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────┐
│  tool-input-start │  ───► 创建 pending 状态的 tool part
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│    tool-call      │  ───► 更新为 running 状态，执行工具
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────────┐
│success│  │   error   │
└───┬───┘  └─────┬─────┘
    │            │
    ▼            ▼
┌───────────┐  ┌───────────┐
│tool-result│  │tool-error │
│ completed │  │   error   │
└───────────┘  └───────────┘
```

### 5.3 Provider 特殊处理

```typescript
// 针对不同 Provider 的工具选择
if (t.id === "codesearch" || t.id === "websearch") {
  // 仅 opencode provider 或 enable flag 启用时可用
  return model.providerID === "opencode" || Flag.OPENCODE_ENABLE_EXA
}

// GPT 模型使用 apply_patch 替代 edit/write
const usePatch = model.modelID.includes("gpt-")
  && !model.modelID.includes("oss")
  && !model.modelID.includes("gpt-4")
if (t.id === "apply_patch") return usePatch
if (t.id === "edit" || t.id === "write") return !usePatch
```

---

## 6. 关键设计模式

### 6.1 分层 Prompt 策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    Prompt Layering Strategy                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Base Instructions (Model-specific)                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ codex_header.txt / anthropic.txt / beast.txt / gemini.txt  ││
│  │ - 定义 AI 身份                                              ││
│  │ - 基础行为准则                                              ││
│  │ - 工具使用策略                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              +                                   │
│  Layer 2: Environment Context (Dynamic)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ - 工作目录 / Git 状态                                       ││
│  │ - 平台信息 / 日期                                           ││
│  │ - 模型 ID 信息                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              +                                   │
│  Layer 3: Agent Customization (Optional)                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ - Agent 专用 prompt                                         ││
│  │ - 权限规则                                                  ││
│  │ - 模型参数覆盖                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              +                                   │
│  Layer 4: User Overrides (Per-request)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ - 用户消息中的 system prompt                                ││
│  │ - 工具启用/禁用                                             ││
│  │ - 变体选择                                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 权限系统

```typescript
// 权限规则示例
const defaults = PermissionNext.fromConfig({
  "*": "allow",                    // 默认允许所有
  "doom_loop": "ask",              // 循环检测需确认
  "external_directory": {          // 外部目录
    "*": "ask",
    [whitelistedDir]: "allow",
  },
  "question": "deny",              // 默认禁止提问工具
  "read": {                        // 读取权限
    "*": "allow",
    "*.env": "ask",                // .env 文件需确认
    "*.env.*": "ask",
    "*.env.example": "allow",
  },
})
```

### 6.3 输出截断策略

```typescript
// truncation.ts - 处理大输出
const MAX_LINES = 2000
const MAX_BYTES = 100000

export async function output(content: string, options, agent) {
  if (content.length <= MAX_BYTES && lineCount <= MAX_LINES) {
    return { content, truncated: false }
  }

  // 写入临时文件
  const outputPath = await writeTruncatedFile(content)

  return {
    content: truncatedContent,
    truncated: true,
    outputPath,
  }
}
```

### 6.4 Plugin 扩展点

```typescript
// 可用的 Plugin 触发点
await Plugin.trigger("tool.definition", { toolID }, output)
await Plugin.trigger("shell.env", { cwd, sessionID, callID }, { env: {} })
await Plugin.trigger("chat.params", { sessionID, agent, model }, params)
await Plugin.trigger("chat.headers", { sessionID, agent, model }, { headers })
await Plugin.trigger("experimental.chat.system.transform", { model }, { system })
```

---

## 附录 A: 文件路径参考

| 功能 | 路径 |
|------|------|
| 主 System Prompt | `packages/opencode/src/session/prompt/codex_header.txt` |
| Claude Prompt | `packages/opencode/src/session/prompt/anthropic.txt` |
| GPT/o1/o3 Prompt | `packages/opencode/src/session/prompt/beast.txt` |
| Gemini Prompt | `packages/opencode/src/session/prompt/gemini.txt` |
| Qwen Prompt | `packages/opencode/src/session/prompt/qwen.txt` |
| System Prompt 管理 | `packages/opencode/src/session/system.ts` |
| LLM Stream | `packages/opencode/src/session/llm.ts` |
| 工具接口定义 | `packages/opencode/src/tool/tool.ts` |
| 工具注册表 | `packages/opencode/src/tool/registry.ts` |
| Bash 工具 | `packages/opencode/src/tool/bash.ts` |
| Task 工具 | `packages/opencode/src/tool/task.ts` |
| Agent 定义 | `packages/opencode/src/agent/agent.ts` |
| Explore Agent Prompt | `packages/opencode/src/agent/prompt/explore.txt` |

---

## 附录 B: 与 Claude Code 对比

| 特性 | OpenCode | Claude Code |
|------|----------|-------------|
| Prompt 策略 | 多模型适配，不同 Prompt | 单一 Claude 优化 Prompt |
| 工具定义 | Zod + 函数式 | 类似结构 |
| 权限系统 | 规则集 + 模式匹配 | 类似 |
| Agent 系统 | 多 Agent + Subagent | Agent + Subagent |
| 扩展性 | Plugin + MCP + 自定义工具 | MCP + Skills |
| 输出截断 | 2000 行 / 100KB | 类似 |

---

*文档生成日期: 2026-03-10*
*源码版本: OpenCode (venders/opencode)*
