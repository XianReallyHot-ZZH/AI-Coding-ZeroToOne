# OpenAI Codex CLI 架构分析文档

> 基于源代码的深度架构分析
> 分析日期: 2026-03-02
> 项目版本: 最新 master 分支

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [核心模块详解](#3-核心模块详解)
4. [工具系统架构](#4-工具系统架构)
5. [沙箱安全机制](#5-沙箱安全机制)
6. [MCP 协议集成](#6-mcp-协议集成)
7. [IDE 集成架构](#7-ide-集成架构)
8. [TypeScript SDK](#8-typescript-sdk)
9. [数据流与状态管理](#9-数据流与状态管理)
10. [构建与部署](#10-构建与部署)
11. [总结](#11-总结)

---

## 1. 项目概述

### 1.1 项目简介

OpenAI Codex CLI 是一个由 OpenAI 开发的命令行编码代理工具，可以在本地计算机上运行。它能够：

- 理解自然语言指令并执行编程任务
- 读写文件、应用补丁、执行 shell 命令
- 通过沙箱机制确保安全执行
- 支持 IDE 集成和 MCP 协议

### 1.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| **核心实现** | Rust (Edition 2024, 67 crates) |
| **分发包装** | TypeScript/Node.js |
| **程序化 API** | TypeScript SDK |
| **终端 UI** | Ratatui 0.29 |
| **异步运行时** | Tokio 1.x |
| **构建系统** | Bazel + Cargo |
| **数据库** | SQLite (via SQLx) |
| **序列化** | serde/serde_json |

### 1.3 项目结构

```
codex/
├── codex-cli/           # Node.js 分发包装器
├── codex-rs/            # Rust 核心实现 (67 个 crate)
│   ├── cli/             # 命令行入口
│   ├── tui/             # 终端用户界面
│   ├── core/            # 核心业务逻辑
│   ├── exec/            # 无头执行模式
│   ├── app-server/      # IDE 集成服务器
│   ├── mcp-server/      # MCP 服务器实现
│   ├── config/          # 配置管理
│   ├── protocol/        # 协议定义
│   ├── state/           # 状态数据库
│   └── ...              # 其他工具 crate
├── sdk/typescript/      # TypeScript SDK
├── shell-tool-mcp/      # MCP Shell 工具
├── docs/                # 文档
└── scripts/             # 构建脚本
```

---

## 2. 整体架构

### 2.1 系统架构图

```mermaid
graph TB
    subgraph "用户界面层"
        CLI[CLI 入口<br/>codex-rs/cli]
        TUI[TUI 界面<br/>codex-rs/tui]
        SDK[TypeScript SDK<br/>sdk/typescript]
        IDE[IDE 扩展<br/>VS Code/Cursor]
    end

    subgraph "协议层"
        AS_Protocol[App-Server Protocol<br/>JSON-RPC]
        MCP_Protocol[MCP Protocol<br/>Model Context Protocol]
        JSONL[JSONL 协议<br/>stdin/stdout]
    end

    subgraph "核心引擎层"
        Core[Codex Core<br/>codex-rs/core]
        ThreadManager[Thread Manager<br/>会话管理]
        Agent[Agent Engine<br/>代理引擎]
    end

    subgraph "工具系统"
        ToolRouter[Tool Router<br/>工具路由器]
        Registry[Tool Registry<br/>工具注册表]
        Handlers[Tool Handlers<br/>工具处理器]
    end

    subgraph "安全沙箱层"
        Sandbox[Sandbox Manager<br/>沙箱管理器]
        Seatbelt[macOS Seatbelt]
        Landlock[Linux Landlock]
        WindowsSandbox[Windows Sandbox]
    end

    subgraph "外部服务"
        OpenAI[OpenAI API<br/>Responses API]
        MCP_Servers[MCP Servers<br/>外部工具]
        FileSystem[文件系统]
        Shell[Shell 执行]
    end

    CLI --> Core
    TUI --> Core
    SDK --> JSONL --> CLI
    IDE --> AS_Protocol --> Core

    Core --> ThreadManager
    Core --> Agent
    Core --> ToolRouter

    ToolRouter --> Registry
    ToolRouter --> Handlers

    Handlers --> Sandbox
    Sandbox --> Seatbelt
    Sandbox --> Landlock
    Sandbox --> WindowsSandbox

    Agent --> OpenAI
    Handlers --> FileSystem
    Handlers --> Shell
    Core --> MCP_Protocol --> MCP_Servers
```

### 2.2 组件关系图

```mermaid
graph LR
    subgraph "入口点"
        A[codex command]
        B[codex exec]
        C[codex tui]
        D[codex mcp]
    end

    subgraph "核心 Crate"
        E[codex-core]
        F[codex-protocol]
        G[codex-config]
        H[codex-state]
    end

    subgraph "工具 Crate"
        I[codex-shell-command]
        J[codex-file-search]
        K[codex-apply-patch]
        L[codex-skills]
    end

    subgraph "平台 Crate"
        M[codex-linux-sandbox]
        N[windows-sandbox-rs]
        O[codex-shell-escalation]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K
    E --> L
    E --> M
    E --> N
    E --> O
```

---

## 3. 核心模块详解

### 3.1 codex-core

核心模块是整个系统的心脏，包含代理逻辑、工具协调、状态管理等关键功能。

```mermaid
graph TB
    subgraph "codex-core 内部架构"
        Codex[Codex 主类<br/>codex.rs]
        ThreadManager[Thread Manager<br/>会话管理]
        Client[Model Client<br/>API 客户端]
        ContextManager[Context Manager<br/>上下文管理]
        MCPManager[MCP Connection Manager<br/>MCP 连接管理]
    end

    subgraph "配置子系统"
        Config[Config<br/>配置加载]
        ConfigLoader[Config Loader<br/>配置加载器]
        Features[Features<br/>特性开关]
    end

    subgraph "执行子系统"
        ExecPolicy[Exec Policy<br/>执行策略]
        Shell[Shell<br/>Shell 执行]
        Terminal[Terminal<br/>终端处理]
    end

    subgraph "状态子系统"
        StateDB[State DB<br/>状态数据库]
        Rollout[Rollout Recorder<br/>会话记录]
        ThreadState[Thread State<br/>线程状态]
    end

    Codex --> ThreadManager
    Codex --> Client
    Codex --> ContextManager
    Codex --> MCPManager

    Codex --> Config
    Config --> ConfigLoader
    Config --> Features

    Codex --> ExecPolicy
    ExecPolicy --> Shell
    Shell --> Terminal

    ThreadManager --> StateDB
    ThreadManager --> Rollout
    ThreadManager --> ThreadState
```

#### 关键文件说明

| 文件 | 职责 |
|------|------|
| `codex.rs` | 核心代理实现，处理用户交互、工具调用、事件流 |
| `thread_manager.rs` | 管理对话线程的生命周期 |
| `client.rs` | 与 OpenAI API 通信的客户端 |
| `exec_policy.rs` | 执行策略检查和管理 |
| `mcp_connection_manager.rs` | MCP 服务器连接管理 |
| `state_db.rs` | SQLite 状态持久化 |
| `safety.rs` | 平台沙箱获取和配置 |

### 3.2 CLI 入口 (codex-rs/cli)

```mermaid
graph TB
    Main[main.rs<br/>CLI 入口]

    subgraph "子命令"
        Login[login<br/>登录认证]
        Logout[logout<br/>登出]
        Exec[exec<br/>无头执行]
        MCP[mcp<br/>MCP 服务器]
        Sandbox[sandbox<br/>沙箱测试]
        TUI[tui<br/>交互界面]
    end

    subgraph "平台分发"
        SeatbeltCmd[SeatbeltCommand<br/>macOS]
        LandlockCmd[LandlockCommand<br/>Linux]
        WindowsCmd[WindowsCommand<br/>Windows]
    end

    Main --> Login
    Main --> Logout
    Main --> Exec
    Main --> MCP
    Main --> Sandbox
    Main --> TUI

    Main --> SeatbeltCmd
    Main --> LandlockCmd
    Main --> WindowsCmd
```

### 3.3 TUI 模块 (codex-rs/tui)

```mermaid
graph TB
    subgraph "TUI 架构"
        App[App<br/>主应用状态]
        ChatWidget[ChatWidget<br/>聊天组件]
        HistoryCell[HistoryCell<br/>历史消息渲染]
        DiffRender[DiffRender<br/>差异渲染]
    end

    subgraph "输入处理"
        CwdPrompt[CwdPrompt<br/>工作目录提示]
        ClipboardPaste[ClipboardPaste<br/>剪贴板粘贴]
        Voice[Voice<br/>语音输入]
    end

    subgraph "渲染组件"
        MarkdownRender[MarkdownRender<br/>Markdown 渲染]
        PagerOverlay[PagerOverlay<br/>分页覆盖层]
        StatusIndicator[StatusIndicator<br/>状态指示器]
    end

    subgraph "主题系统"
        ThemePicker[ThemePicker<br/>主题选择]
        TerminalPalette[TerminalPalette<br/>终端调色板]
    end

    App --> ChatWidget
    App --> HistoryCell
    App --> DiffRender

    ChatWidget --> CwdPrompt
    ChatWidget --> ClipboardPaste
    ChatWidget --> Voice

    HistoryCell --> MarkdownRender
    App --> PagerOverlay
    App --> StatusIndicator

    App --> ThemePicker
    ThemePicker --> TerminalPalette
```

---

## 4. 工具系统架构

### 4.1 工具系统概览

```mermaid
graph TB
    subgraph "工具注册与路由"
        Registry[Tool Registry<br/>工具注册表]
        Router[Tool Router<br/>工具路由器]
        Orchestrator[Tool Orchestrator<br/>工具编排器]
    end

    subgraph "内置工具"
        Shell[Shell Tool<br/>命令执行]
        ReadFile[Read File<br/>文件读取]
        ListDir[List Directory<br/>目录列表]
        ApplyPatch[Apply Patch<br/>应用补丁]
        Grep[Grep Files<br/>文件搜索]
    end

    subgraph "高级工具"
        UnifiedExec[Unified Exec<br/>统一执行]
        JSRepl[JS REPL<br/>JavaScript 环境]
        Plan[Plan Tool<br/>计划工具]
        SearchBM25[Search BM25<br/>语义搜索]
    end

    subgraph "MCP 工具"
        MCPTool[MCP Tools<br/>MCP 工具代理]
        MCPResource[MCP Resources<br/>MCP 资源访问]
    end

    subgraph "多代理工具"
        MultiAgent[Multi Agents<br/>多代理协调]
        AgentJobs[Agent Jobs<br/>代理任务]
    end

    Registry --> Router
    Router --> Orchestrator

    Orchestrator --> Shell
    Orchestrator --> ReadFile
    Orchestrator --> ListDir
    Orchestrator --> ApplyPatch
    Orchestrator --> Grep

    Orchestrator --> UnifiedExec
    Orchestrator --> JSRepl
    Orchestrator --> Plan
    Orchestrator --> SearchBM25

    Orchestrator --> MCPTool
    Orchestrator --> MCPResource

    Orchestrator --> MultiAgent
    Orchestrator --> AgentJobs
```

### 4.2 工具处理器列表

| 处理器文件 | 功能描述 |
|-----------|----------|
| `shell.rs` | Shell 命令执行，支持多种后端 |
| `read_file.rs` | 文件读取，支持编码检测 |
| `list_dir.rs` | 目录列表，支持过滤 |
| `apply_patch.rs` | 应用 unified diff 补丁 |
| `grep_files.rs` | 文件内容搜索 |
| `unified_exec.rs` | 统一执行环境 (ConPTY) |
| `js_repl.rs` | JavaScript REPL 环境 |
| `plan.rs` | 计划制定工具 |
| `search_tool_bm25.rs` | BM25 语义搜索 |
| `mcp.rs` | MCP 工具调用代理 |
| `mcp_resource.rs` | MCP 资源访问 |
| `multi_agents.rs` | 多代理协调执行 |
| `agent_jobs.rs` | 批量代理任务 |
| `view_image.rs` | 图像查看工具 |
| `request_user_input.rs` | 请求用户输入 |

### 4.3 工具执行流程

```mermaid
sequenceDiagram
    participant Agent as Agent Engine
    participant Router as Tool Router
    participant Handler as Tool Handler
    participant Sandbox as Sandbox Manager
    participant FS as File System/Shell

    Agent->>Router: 工具调用请求
    Router->>Router: 查找工具处理器
    Router->>Handler: 分发到处理器

    alt 需要沙箱执行
        Handler->>Sandbox: 创建沙箱命令
        Sandbox->>FS: 在沙箱中执行
        FS-->>Sandbox: 执行结果
        Sandbox-->>Handler: 返回结果
    else 直接执行
        Handler->>FS: 直接执行
        FS-->>Handler: 返回结果
    end

    Handler-->>Router: 工具输出
    Router-->>Agent: 返回给模型
```

---

## 5. 沙箱安全机制

### 5.1 沙箱架构

```mermaid
graph TB
    subgraph "沙箱管理层"
        Manager[Sandbox Manager<br/>sandboxing/mod.rs]
        Policy[Sandbox Policy<br/>策略配置]
        Permissions[Sandbox Permissions<br/>权限配置]
    end

    subgraph "平台实现"
        subgraph "macOS"
            Seatbelt[Seatbelt<br/>seatbelt.rs]
            SBPL[SBPL Rules<br/>.sbpl 文件]
        end

        subgraph "Linux"
            Landlock[Landlock<br/>landlock.rs]
            Seccomp[Seccompiler<br/>系统调用过滤]
        end

        subgraph "Windows"
            WinSandbox[Windows Sandbox<br/>windows_sandbox.rs]
            RestrictedToken[Restricted Token<br/>受限令牌]
        end
    end

    subgraph "网络隔离"
        NetworkProxy[Network Proxy<br/>网络代理]
        NetworkPolicy[Network Policy<br/>网络策略]
    end

    Manager --> Policy
    Manager --> Permissions

    Manager --> Seatbelt
    Seatbelt --> SBPL

    Manager --> Landlock
    Landlock --> Seccomp

    Manager --> WinSandbox
    WinSandbox --> RestrictedToken

    Manager --> NetworkProxy
    NetworkProxy --> NetworkPolicy
```

### 5.2 沙箱类型

```mermaid
graph LR
    subgraph "沙箱类型"
        Auto[Auto<br/>自动选择]
        Seatbelt[Seatbelt<br/>macOS 专用]
        Landlock[Landlock<br/>Linux 专用]
        Windows[Windows Sandbox<br/>Windows 专用]
        None[None<br/>禁用沙箱]
    end

    subgraph "权限级别"
        ReadOnly[Read Only<br/>只读]
        ReadWrite[Read Write<br/>读写]
        FullAccess[Full Access<br/>完全访问]
    end

    Auto --> |macOS| Seatbelt
    Auto --> |Linux| Landlock
    Auto --> |Windows| Windows

    Seatbelt --> ReadOnly
    Seatbelt --> ReadWrite
    Landlock --> ReadOnly
    Landlock --> ReadWrite
    Windows --> ReadOnly
    Windows --> ReadWrite
```

### 5.3 沙箱执行流程

```mermaid
sequenceDiagram
    participant Tool as Tool Handler
    participant Sandbox as Sandbox Manager
    participant Platform as Platform Sandbox
    participant Exec as Execution Environment

    Tool->>Sandbox: 创建 ExecRequest
    Sandbox->>Sandbox: 确定 SandboxType
    Sandbox->>Sandbox: 计算 Permissions

    alt macOS
        Sandbox->>Platform: 生成 Seatbelt 规则
        Platform->>Exec: 通过 sandbox-exec 执行
    else Linux
        Sandbox->>Platform: 配置 Landlock 规则
        Platform->>Exec: 通过 bwrap/codex-linux-sandbox 执行
    else Windows
        Sandbox->>Platform: 创建受限令牌
        Platform->>Exec: 使用受限权限执行
    end

    Exec-->>Platform: 执行结果
    Platform-->>Sandbox: 结果处理
    Sandbox-->>Tool: 返回 ExecToolCallOutput
```

---

## 6. MCP 协议集成

### 6.1 MCP 架构

```mermaid
graph TB
    subgraph "Codex MCP 客户端"
        MCPManager[MCP Connection Manager<br/>连接管理]
        RMCPClient[RMCP Client<br/>Rust MCP 客户端]
        ToolCall[MCP Tool Call<br/>工具调用处理]
    end

    subgraph "MCP Server (Codex 提供)"
        MCPServer[MCP Server<br/>codex-rs/mcp-server]
        CodexToolConfig[Codex Tool Config<br/>工具配置]
        CodexToolRunner[Codex Tool Runner<br/>工具运行器]
    end

    subgraph "外部 MCP 服务器"
        FilesystemMCP[Filesystem MCP<br/>文件系统]
        GitMCP[Git MCP<br/>Git 操作]
        CustomMCP[Custom MCP<br/>自定义工具]
    end

    MCPManager --> RMCPClient
    RMCPClient --> ToolCall

    MCPServer --> CodexToolConfig
    MCPServer --> CodexToolRunner

    MCPManager <-->|MCP Protocol| FilesystemMCP
    MCPManager <-->|MCP Protocol| GitMCP
    MCPManager <-->|MCP Protocol| CustomMCP

    External[外部客户端] <-->|MCP Protocol| MCPServer
```

### 6.2 MCP Server 实现

```mermaid
graph LR
    subgraph "MCP Server 组件"
        Main[main.rs<br/>入口]
        Lib[lib.rs<br/>服务器逻辑]
        MessageProcessor[message_processor.rs<br/>消息处理]
        OutgoingMessage[outgoing_message.rs<br/>出站消息]
    end

    subgraph "工具处理器"
        ToolHandlers[tool_handlers/<br/>工具处理器目录]
        ExecApproval[exec_approval.rs<br/>执行审批]
        PatchApproval[patch_approval.rs<br/>补丁审批]
    end

    Main --> Lib
    Lib --> MessageProcessor
    Lib --> OutgoingMessage

    MessageProcessor --> ToolHandlers
    ToolHandlers --> ExecApproval
    ToolHandlers --> PatchApproval
```

### 6.3 MCP 工具调用流程

```mermaid
sequenceDiagram
    participant Model as Model Response
    participant Core as Codex Core
    participant MCPManager as MCP Manager
    participant MCPServer as MCP Server
    participant Tool as External Tool

    Model->>Core: 工具调用请求 (MCP 工具)
    Core->>MCPManager: 查找 MCP 连接
    MCPManager->>MCPServer: 获取工具列表

    alt 工具存在
        MCPServer-->>MCPManager: 工具定义
        MCPManager->>Tool: 调用工具
        Tool-->>MCPManager: 工具结果
        MCPManager-->>Core: 返回结果
        Core-->>Model: 提交工具输出
    else 工具不存在
        MCPServer-->>MCPManager: 工具未找到
        MCPManager-->>Core: 错误
        Core-->>Model: 错误消息
    end
```

---

## 7. IDE 集成架构

### 7.1 App-Server 架构

```mermaid
graph TB
    subgraph "IDE 扩展"
        VSCode[VS Code Extension]
        Cursor[Cursor Extension]
        Windsurf[Windsurf Extension]
    end

    subgraph "通信层"
        WebSocket[WebSocket<br/>双向通信]
        JSONRPC[JSON-RPC 2.0<br/>协议]
    end

    subgraph "App-Server"
        Server[App Server<br/>codex-rs/app-server]
        Transport[Transport<br/>传输层]
        MessageProcessor[Message Processor<br/>消息处理]
    end

    subgraph "协议层"
        V1[Protocol V1<br/>旧版协议]
        V2[Protocol V2<br/>新版协议]
        Common[Common Types<br/>公共类型]
    end

    VSCode --> WebSocket
    Cursor --> WebSocket
    Windsurf --> WebSocket

    WebSocket --> JSONRPC
    JSONRPC --> Server

    Server --> Transport
    Server --> MessageProcessor

    MessageProcessor --> V1
    MessageProcessor --> V2
    V1 --> Common
    V2 --> Common
```

### 7.2 App-Server Protocol

```mermaid
graph LR
    subgraph "请求类型"
        ThreadCreate[thread/create<br/>创建线程]
        ThreadRead[thread/read<br/>读取线程]
        AppList[app/list<br/>应用列表]
        ConfigRead[config/read<br/>读取配置]
        ConfigWrite[config/write<br/>写入配置]
    end

    subgraph "通知类型"
        ThreadStarted[thread/started<br/>线程启动]
        TurnCompleted[turn/completed<br/>回合完成]
        ItemCompleted[item/completed<br/>项目完成]
        StatusUpdate[status/update<br/>状态更新]
    end

    subgraph "数据类型"
        ThreadParams[*Params<br/>请求参数]
        ThreadResponse[*Response<br/>响应数据]
        ThreadNotification[*Notification<br/>通知数据]
    end

    ThreadCreate --> ThreadParams
    ThreadRead --> ThreadParams
    AppList --> ThreadParams
    ConfigRead --> ThreadParams
    ConfigWrite --> ThreadParams

    ThreadStarted --> ThreadNotification
    TurnCompleted --> ThreadNotification
    ItemCompleted --> ThreadNotification
    StatusUpdate --> ThreadNotification
```

---

## 8. TypeScript SDK

### 8.1 SDK 架构

```mermaid
graph TB
    subgraph "SDK 入口"
        Codex[Codex<br/>主类]
        Thread[Thread<br/>会话类]
    end

    subgraph "执行层"
        CodexExec[CodexExec<br/>执行器]
        Spawn[child_process.spawn<br/>进程启动]
        JSONLParser[JSONL Parser<br/>输出解析]
    end

    subgraph "类型定义"
        Events[events.ts<br/>事件类型]
        Items[items.ts<br/>项目类型]
        Options[Options<br/>配置选项]
    end

    subgraph "平台二进制"
        LinuxX64[@openai/codex-linux-x64]
        LinuxArm64[@openai/codex-linux-arm64]
        DarwinX64[@openai/codex-darwin-x64]
        DarwinArm64[@openai/codex-darwin-arm64]
        Win32X64[@openai/codex-win32-x64]
        Win32Arm64[@openai/codex-win32-arm64]
    end

    Codex --> Thread
    Thread --> CodexExec
    CodexExec --> Spawn
    Spawn --> JSONLParser

    Thread --> Events
    Thread --> Items
    Codex --> Options

    Spawn --> LinuxX64
    Spawn --> LinuxArm64
    Spawn --> DarwinX64
    Spawn --> DarwinArm64
    Spawn --> Win32X64
    Spawn --> Win32Arm64
```

### 8.2 SDK 使用流程

```mermaid
sequenceDiagram
    participant User as 用户代码
    participant Codex as Codex 实例
    participant Thread as Thread 实例
    participant Exec as CodexExec
    participant Binary as Codex Binary

    User->>Codex: new Codex(options)
    User->>Codex: startThread(options)
    Codex->>Thread: new Thread(...)

    User->>Thread: runStreamed(input)
    Thread->>Exec: run(args)
    Exec->>Binary: spawn codex exec --experimental-json

    loop 事件流
        Binary-->>Exec: JSONL 事件
        Exec-->>Thread: ThreadEvent
        Thread-->>User: yield event
    end

    Binary-->>Exec: 进程结束
    Exec-->>Thread: 完成
    Thread-->>User: Turn 结果
```

### 8.3 SDK 事件类型

| 事件类型 | 描述 |
|---------|------|
| `thread.started` | 线程启动 |
| `thread.resumed` | 线程恢复 |
| `turn.started` | 回合开始 |
| `turn.completed` | 回合完成 |
| `turn.failed` | 回合失败 |
| `item.started` | 项目开始 |
| `item.completed` | 项目完成 |
| `agent_message` | 代理消息 |
| `file_change` | 文件变更 |
| `exec_output` | 执行输出 |

---

## 9. 数据流与状态管理

### 9.1 完整请求流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant TUI as TUI/CLI
    participant Core as Codex Core
    participant Client as Model Client
    participant API as OpenAI API
    participant Tools as Tool System
    participant Sandbox as Sandbox
    participant State as State DB

    User->>TUI: 输入消息
    TUI->>Core: submit(Op::UserTurn)
    Core->>State: 保存会话状态
    Core->>Client: 发送请求

    Client->>API: POST /responses (SSE)
    API-->>Client: 流式响应

    loop 事件处理
        Client-->>Core: ResponseEvent
        Core->>Core: 解析事件

        alt 工具调用
            Core->>Tools: 执行工具
            Tools->>Sandbox: 沙箱执行
            Sandbox-->>Tools: 执行结果
            Tools-->>Core: 工具输出
            Core->>Client: 提交工具输出
            Client->>API: POST /responses
        else 消息完成
            Core->>TUI: 发送事件
            TUI->>User: 显示响应
        end
    end

    API-->>Client: 响应完成
    Client-->>Core: Turn 完成
    Core->>State: 保存最终状态
    Core-->>TUI: TurnCompleted
```

### 9.2 状态持久化

```mermaid
graph TB
    subgraph "状态存储"
        SQLite[SQLite 数据库<br/>~/.codex/state/]
        Sessions[Session 文件<br/>~/.codex/sessions/]
        Config[配置文件<br/>~/.codex/config.toml]
    end

    subgraph "状态类型"
        ThreadState[Thread State<br/>线程状态]
        AuthState[Auth State<br/>认证状态]
        ConfigState[Config State<br/>配置状态]
        RolloutState[Rollout State<br/>会话记录]
    end

    subgraph "管理器"
        ThreadManager[Thread Manager]
        AuthManager[Auth Manager]
        ConfigLoader[Config Loader]
        RolloutRecorder[Rollout Recorder]
    end

    ThreadManager --> ThreadState
    ThreadState --> SQLite

    AuthManager --> AuthState
    AuthState --> Keyring/SQLite

    ConfigLoader --> ConfigState
    ConfigState --> Config

    RolloutRecorder --> RolloutState
    RolloutState --> Sessions
```

### 9.3 配置层次结构

```mermaid
graph TB
    subgraph "配置优先级 (低到高)"
        Defaults[默认配置<br/>代码内置]
        Global[全局配置<br/>~/.codex/config.toml]
        Project[项目配置<br/>.codex/config.toml]
        CLI[CLI 参数<br/>--config]
        Env[环境变量<br/>CODEX_*]
    end

    subgraph "配置类型"
        Model[model<br/>模型配置]
        Sandbox[sandbox<br/>沙箱配置]
        Features[features<br/>特性开关]
        MCP[mcp_servers<br/>MCP 服务器]
        Approval[approval<br/>审批策略]
    end

    Defaults --> Global
    Global --> Project
    Project --> CLI
    CLI --> Env

    Env --> Model
    Env --> Sandbox
    Env --> Features
    Env --> MCP
    Env --> Approval
```

---

## 10. 构建与部署

### 10.1 构建系统

```mermaid
graph TB
    subgraph "构建工具"
        Bazel[Bazel<br/>主构建系统]
        Cargo[Cargo<br/>Rust 构建]
        PNPM[PNPM<br/>Node.js 包管理]
        Just[Just<br/>任务运行器]
    end

    subgraph "构建产物"
        Binaries[平台二进制<br/>codex-*]
        NPM[NPM 包<br/>@openai/codex]
        SDK[SDK 包<br/>@openai/codex-sdk]
    end

    subgraph "发布流程"
        GitHub[GitHub Actions]
        Release[GitHub Release]
        NPMRegistry[NPM Registry]
    end

    Bazel --> Binaries
    Cargo --> Binaries
    PNPM --> NPM
    PNPM --> SDK

    Binaries --> GitHub
    NPM --> GitHub
    SDK --> GitHub

    GitHub --> Release
    GitHub --> NPMRegistry
```

### 10.2 平台支持

| 平台 | 架构 | 目标三元组 | 沙箱机制 |
|------|------|-----------|----------|
| Linux | x64 | `x86_64-unknown-linux-musl` | Landlock + Seccomp |
| Linux | arm64 | `aarch64-unknown-linux-musl` | Landlock + Seccomp |
| macOS | x64 | `x86_64-apple-darwin` | Seatbelt |
| macOS | arm64 | `aarch64-apple-darwin` | Seatbelt |
| Windows | x64 | `x86_64-pc-windows-gnullvm` | Restricted Token |
| Windows | arm64 | `aarch64-pc-windows-gnullvm` | Restricted Token |

### 10.3 依赖关系图

```mermaid
graph BT
    subgraph "核心依赖"
        Tokio[Tokio<br/>异步运行时]
        Reqwest[Reqwest<br/>HTTP 客户端]
        SQLx[SQLx<br/>数据库]
        Serde[Serde<br/>序列化]
    end

    subgraph "UI 依赖"
        Ratatui[Ratatui<br/>TUI 框架]
        Crossterm[Crossterm<br/>终端控制]
    end

    subgraph "协议依赖"
        RMCP[RMCP<br/>MCP 客户端]
        Tungstenite[Tungstenite<br/>WebSocket]
    end

    subgraph "平台依赖"
        Landlock[Landlock<br/>Linux 沙箱]
        Keyring[Keyring<br/>密钥存储]
    end

    codex-core --> Tokio
    codex-core --> Reqwest
    codex-core --> SQLx
    codex-core --> Serde

    codex-tui --> Ratatui
    codex-tui --> Crossterm

    codex-core --> RMCP
    app-server --> Tungstenite

    codex-core --> Landlock
    codex-core --> Keyring
```

---

## 11. 总结

### 11.1 架构特点

1. **模块化设计**: 67 个 Rust crate 实现高度解耦
2. **多入口支持**: CLI、TUI、SDK、MCP Server、App-Server
3. **跨平台沙箱**: macOS Seatbelt、Linux Landlock、Windows Restricted Token
4. **协议丰富**: JSON-RPC、MCP、JSONL、SSE
5. **类型安全**: Rust + TypeScript 双重类型保障

### 11.2 关键技术亮点

| 特性 | 实现方式 |
|------|----------|
| 流式响应 | SSE (Server-Sent Events) + WebSocket |
| 安全执行 | 多平台沙箱 + 网络代理 |
| 工具扩展 | MCP 协议 + 内置工具注册表 |
| IDE 集成 | App-Server Protocol (JSON-RPC over WebSocket) |
| 状态持久化 | SQLite + 文件系统会话 |
| 配置管理 | TOML 多层次配置合并 |

### 11.3 代码规模统计

```
codex-rs/           # 67 crates
├── core/           # 核心逻辑 (~150K LOC)
├── tui/            # 终端 UI (~80K LOC)
├── app-server/     # IDE 集成 (~50K LOC)
├── mcp-server/     # MCP 服务 (~20K LOC)
└── ...             # 其他工具库

sdk/typescript/     # TypeScript SDK (~2K LOC)
codex-cli/          # Node.js 包装器 (~500 LOC)
shell-tool-mcp/     # MCP Shell 工具 (~1K LOC)
```

### 11.4 架构演进建议

1. **核心稳定性**: `codex-core` 已相当成熟，建议保持 API 稳定
2. **协议统一**: V1/V2 协议可考虑统一到 V2
3. **工具扩展**: 建议优先使用 MCP 扩展而非内置工具
4. **测试覆盖**: snapshot 测试覆盖良好，可增加集成测试

---

## 附录: 快速参考

### A. 关键文件路径

| 功能 | 路径 |
|------|------|
| 核心代理逻辑 | `codex-rs/core/src/codex.rs` |
| 工具注册表 | `codex-rs/core/src/tools/registry.rs` |
| 沙箱管理 | `codex-rs/core/src/sandboxing/mod.rs` |
| MCP 连接管理 | `codex-rs/core/src/mcp_connection_manager.rs` |
| TUI 主应用 | `codex-rs/tui/src/app.rs` |
| App-Server | `codex-rs/app-server/src/lib.rs` |
| 协议定义 | `codex-rs/protocol/src/protocol.rs` |
| SDK 入口 | `sdk/typescript/src/codex.ts` |

### B. 常用命令

```bash
# 构建
cargo build --release

# 运行 TUI
cargo run -p codex-cli

# 运行测试
cargo test

# 格式化代码
just fmt

# 生成配置 schema
just write-config-schema

# 运行 MCP server
cargo run -p codex-mcp-server
```

### C. 配置示例

```toml
# ~/.codex/config.toml
model = "codex-1"

[features]
web_search = true

[sandbox]
enabled = true

[mcp_servers.filesystem]
command = "mcp-filesystem"
args = ["/path/to/project"]
```

---

*文档结束*
