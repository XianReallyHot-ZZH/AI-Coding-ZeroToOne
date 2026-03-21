# Simple Multi-turn Agent with Spring AI - Implementation Plan

## 文档信息

| 项目 | 说明 |
|------|------|
| **版本** | 1.0.0 |
| **日期** | 2026-03-21 |
| **设计文档** | `specs/w8/X003-spring-ai-agent-design.md` |
| **预计工期** | 7-10 个工作日 |

---

## 1. 项目概述

### 1.1 目标

基于 Spring AI 框架实现一个多轮对话 Agent，支持：
- 自动工具调用循环
- 流式响应输出
- MCP 工具集成
- 会话管理

### 1.2 技术栈

| 组件 | 版本 |
|------|------|
| Java | 21 LTS |
| Spring Boot | 3.4+ |
| Spring AI | 1.1+ |
| Maven | 3.9+ |

### 1.3 核心交付物

| 交付物 | 说明 |
|--------|------|
| `simple-agent` 项目 | 完整的 Spring Boot 应用 |
| REST API | `/api/v1/agent/chat`, `/api/v1/agent/stream` |
| 内置工具 | bash, readFile, writeFile, http |
| MCP 集成 | 支持 MCP 工具自动加载 |
| 单元测试 | 覆盖率 > 80% |
| 部署配置 | Dockerfile, docker-compose.yml |

---

## 2. 实施阶段

### 阶段总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Implementation Timeline                         │
├────────────┬────────────┬────────────┬────────────┬────────────────────┤
│  Phase 1   │  Phase 2   │  Phase 3   │  Phase 4   │     Phase 5        │
│  基础框架   │  工具系统   │  流式处理   │  MCP 集成   │     测试部署       │
│  1-2 天    │  2 天      │  1-2 天    │  1-2 天    │     2 天          │
└────────────┴────────────┴────────────┴────────────┴────────────────────┘
```

---

## 3. 详细任务列表

### Phase 1: 基础框架搭建 (1-2 天)

#### 任务 1.1: 项目初始化

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-1.1 |
| **任务名称** | 创建 Spring Boot 项目骨架 |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | 无 |

**检查清单**:
- [ ] 创建 Maven 项目
- [ ] 配置 `pom.xml` 依赖
- [ ] 配置 `application.yml`
- [ ] 创建主类 `AgentApplication.java`
- [ ] 验证项目可启动

**验收标准**:
```bash
mvn spring-boot:run
# 应用成功启动，监听 8080 端口
```

---

#### 任务 1.2: 类型定义

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-1.2 |
| **任务名称** | 定义核心数据类型 |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | T-1.1 |

**检查清单**:
- [ ] 创建 `MessageRole` 枚举
- [ ] 创建 `MessageContent` sealed interface
- [ ] 创建 `TextContent`, `ToolCallContent`, `ToolResultContent` records
- [ ] 创建 `Message` record
- [ ] 创建 `AgentEvent` sealed interface 及其实现类

**文件列表**:
```
src/main/java/com/example/agent/types/
├── MessageRole.java
├── MessageContent.java
├── TextContent.java
├── ToolCallContent.java
├── ToolResultContent.java
├── Message.java
├── AgentEvent.java
├── TextEvent.java
├── ToolCallEvent.java
├── ToolResultEvent.java
├── ErrorEvent.java
├── CompleteEvent.java
└── Usage.java
```

---

#### 任务 1.3: 配置类

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-1.3 |
| **任务名称** | 创建配置类 |
| **优先级** | P0 (必须) |
| **预估时间** | 1h |
| **依赖** | T-1.1 |

**检查清单**:
- [ ] 创建 `AgentProperties` 配置类
- [ ] 配置 Spring AI OpenAI
- [ ] 配置日志级别

**文件列表**:
```
src/main/java/com/example/agent/config/
└── AgentProperties.java

src/main/resources/
└── application.yml
```

---

#### 任务 1.4: AgentService 基础实现

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-1.4 |
| **任务名称** | 实现 AgentService (同步调用) |
| **优先级** | P0 (必须) |
| **预估时间** | 3h |
| **依赖** | T-1.2, T-1.3 |

**检查清单**:
- [ ] 创建 `AgentService` 类
- [ ] 注入 `ChatModel`
- [ ] 实现 `chat()` 同步方法
- [ ] 配置 `ChatClient.Builder`

**验收标准**:
```java
// 可调用并返回响应
String response = agentService.chat("session-1", "Hello");
assertThat(response).isNotEmpty();
```

---

### Phase 2: 工具系统 (2 天)

#### 任务 2.1: 内置工具 - bash

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-2.1 |
| **任务名称** | 实现 bash 工具 |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | T-1.4 |

**检查清单**:
- [ ] 创建 `BuiltinTools` 类
- [ ] 实现 `@Tool` 注解的 `bash()` 方法
- [ ] 处理命令超时
- [ ] 处理错误输出
- [ ] 跨平台兼容 (Windows/Linux)

**验收标准**:
```java
String result = builtinTools.bash("echo hello", 5000);
assertThat(result).contains("hello");
```

---

#### 任务 2.2: 内置工具 - readFile / writeFile

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-2.2 |
| **任务名称** | 实现文件读写工具 |
| **优先级** | P0 (必须) |
| **预估时间** | 1.5h |
| **依赖** | T-2.1 |

**检查清单**:
- [ ] 实现 `readFile()` 方法
- [ ] 实现 `writeFile()` 方法
- [ ] 处理文件不存在
- [ ] 自动创建父目录

**验收标准**:
```java
builtinTools.writeFile("/tmp/test.txt", "hello");
String content = builtinTools.readFile("/tmp/test.txt");
assertThat(content).isEqualTo("hello");
```

---

#### 任务 2.3: 内置工具 - http

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-2.3 |
| **任务名称** | 实现 HTTP 工具 |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | T-2.1 |

**检查清单**:
- [ ] 实现 `http()` 方法
- [ ] 支持 GET/POST/PUT/DELETE
- [ ] 支持自定义请求头
- [ ] 处理超时和错误

**验收标准**:
```java
String result = builtinTools.http("GET", "https://httpbin.org/get", null, null);
assertThat(result).contains("200");
```

---

#### 任务 2.4: 工具注册与集成

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-2.4 |
| **任务名称** | 将工具集成到 AgentService |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | T-2.1, T-2.2, T-2.3 |

**检查清单**:
- [ ] 创建 `ToolCallbackProvider` Bean
- [ ] 在 `AgentService` 中注入工具
- [ ] 测试工具调用循环

**验收标准**:
```java
// Agent 应能自动调用工具
String response = agentService.chat("session-1",
    "Read the file /etc/hosts and tell me its contents");
// 响应应包含文件内容
```

---

### Phase 3: 流式处理 (1-2 天)

#### 任务 3.1: 流式响应实现

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-3.1 |
| **任务名称** | 实现流式 chatStream 方法 |
| **优先级** | P0 (必须) |
| **预估时间** | 3h |
| **依赖** | T-2.4 |

**检查清单**:
- [ ] 实现 `chatStream()` 方法
- [ ] 返回 `Flux<AgentEvent>`
- [ ] 处理文本增量
- [ ] 处理工具调用事件

**验收标准**:
```java
Flux<AgentEvent> events = agentService.chatStream("session-1", "Tell me a story");
StepVerifier.create(events)
    .expectNextMatches(e -> e instanceof TextEvent)
    .expectComplete()
    .verify();
```

---

#### 任务 3.2: REST API - 流式端点

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-3.2 |
| **任务名称** | 实现流式 API 端点 |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | T-3.1 |

**检查清单**:
- [ ] 创建 `AgentController`
- [ ] 实现 `POST /api/v1/agent/chat`
- [ ] 实现 `POST /api/v1/agent/stream` (SSE)
- [ ] 处理 Session ID

**验收标准**:
```bash
curl -X POST http://localhost:8080/api/v1/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message": "Hello"}'
# 返回 SSE 流
```

---

### Phase 4: MCP 集成 (1-2 天)

#### 任务 4.1: MCP 客户端配置

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-4.1 |
| **任务名称** | 配置 MCP Client |
| **优先级** | P1 (重要) |
| **预估时间** | 2h |
| **依赖** | T-2.4 |

**检查清单**:
- [ ] 添加 MCP Starter 依赖
- [ ] 创建 `mcp-servers.json`
- [ ] 配置 `application.yml`
- [ ] 验证 MCP 客户端启动

**验收标准**:
```yaml
# 应用启动日志中应显示 MCP 连接
# MCP tools discovered: [filesystem_read, filesystem_write, ...]
```

---

#### 任务 4.2: MCP 工具集成

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-4.2 |
| **任务名称** | 将 MCP 工具合并到 Agent |
| **优先级** | P1 (重要) |
| **预估时间** | 2h |
| **依赖** | T-4.1 |

**检查清单**:
- [ ] 注入 MCP `ToolCallbackProvider`
- [ ] 合并内置工具和 MCP 工具
- [ ] 测试 MCP 工具调用

**验收标准**:
```java
// Agent 应能调用 MCP 工具
String response = agentService.chat("session-1",
    "Use the filesystem tool to read /tmp/test.txt");
```

---

#### 任务 4.3: MCP 自定义 (可选)

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-4.3 |
| **任务名称** | 实现 MCP 客户端自定义 |
| **优先级** | P2 (可选) |
| **预估时间** | 1h |
| **依赖** | T-4.1 |

**检查清单**:
- [ ] 创建 `CustomMcpClientCustomizer`
- [ ] 配置超时
- [ ] 添加工具变更监听

---

### Phase 5: 会话管理与测试部署 (2 天)

#### 任务 5.1: 会话管理

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-5.1 |
| **任务名称** | 实现 ChatMemory |
| **优先级** | P0 (必须) |
| **预估时间** | 2h |
| **依赖** | T-3.2 |

**检查清单**:
- [ ] 创建 `ChatMemoryConfig`
- [ ] 配置 `MessageChatMemoryAdvisor`
- [ ] 测试多轮对话

**验收标准**:
```java
// 第一轮
agentService.chat("session-1", "My name is Alice");
// 第二轮
String response = agentService.chat("session-1", "What's my name?");
assertThat(response).containsIgnoringCase("Alice");
```

---

#### 任务 5.2: 错误处理

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-5.2 |
| **任务名称** | 实现全局异常处理 |
| **优先级** | P0 (必须) |
| **预估时间** | 1h |
| **依赖** | T-3.2 |

**检查清单**:
- [ ] 创建 `GlobalExceptionHandler`
- [ ] 创建 `ErrorResponse` record
- [ ] 处理 `ToolExecutionException`

---

#### 任务 5.3: 单元测试

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-5.3 |
| **任务名称** | 编写单元测试 |
| **优先级** | P0 (必须) |
| **预估时间** | 3h |
| **依赖** | T-5.1, T-5.2 |

**检查清单**:
- [ ] `AgentServiceTest`
- [ ] `BuiltinToolsTest`
- [ ] `AgentControllerIntegrationTest`
- [ ] 覆盖率 > 80%

---

#### 任务 5.4: 可观测性

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-5.4 |
| **任务名称** | 添加监控和健康检查 |
| **优先级** | P1 (重要) |
| **预估时间** | 2h |
| **依赖** | T-5.1 |

**检查清单**:
- [ ] 配置 Actuator
- [ ] 创建 `AgentHealthIndicator`
- [ ] 创建 `AgentMetrics`

---

#### 任务 5.5: 部署配置

| 属性 | 内容 |
|------|------|
| **任务 ID** | T-5.5 |
| **任务名称** | 创建部署配置 |
| **优先级** | P1 (重要) |
| **预估时间** | 2h |
| **依赖** | T-5.3 |

**检查清单**:
- [ ] 创建 `Dockerfile`
- [ ] 创建 `docker-compose.yml`
- [ ] 创建 `README.md`

---

## 4. 任务依赖关系

```
T-1.1 (项目初始化)
  │
  ├──► T-1.2 (类型定义)
  │      │
  │      └──► T-1.4 (AgentService) ──► T-2.4 (工具集成) ──► T-3.1 (流式)
  │                                                              │
  └──► T-1.3 (配置类)                                           └──► T-3.2 (API)
                                                                   │
T-2.1 (bash) ──┬──► T-2.4                                       └──► T-5.1 (会话)
               │                                                    │
T-2.2 (文件) ──┤                                                    ├──► T-5.2 (错误处理)
               │                                                    │
T-2.3 (http) ──┘                                                    └──► T-5.3 (测试)
                                                                         │
T-4.1 (MCP配置) ──► T-4.2 (MCP集成) ──► T-4.3 (MCP自定义)               │
              │                                                         │
              └──► T-2.4                                                └──► T-5.4 (监控) ──► T-5.5 (部署)
```

---

## 5. 时间估算

| 阶段 | 任务数 | 预估时间 | 累计 |
|------|--------|----------|------|
| Phase 1: 基础框架 | 4 | 8h | 1 天 |
| Phase 2: 工具系统 | 4 | 7.5h | 2 天 |
| Phase 3: 流式处理 | 2 | 5h | 3 天 |
| Phase 4: MCP 集成 | 3 | 5h | 4 天 |
| Phase 5: 测试部署 | 5 | 10h | 5-6 天 |
| **总计** | **18** | **35.5h** | **5-6 天** |

**预留缓冲**: 2 天 (应对不可预见问题)

**最坏情况**: 7-8 天

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Spring AI 版本兼容性问题 | 中 | 高 | 使用稳定版本 1.1.x，锁定版本号 |
| MCP Server 连接失败 | 中 | 中 | 添加重试机制，提供详细错误日志 |
| 跨平台 bash 工具问题 | 高 | 中 | 检测操作系统，使用兼容命令 |
| LLM API 限流 | 中 | 中 | 实现指数退避重试 |
| 流式响应中断 | 低 | 中 | 实现断点续传或重连机制 |

---

## 7. 验收标准

### 7.1 功能验收

| 功能 | 验收标准 |
|------|----------|
| 同步对话 | `POST /api/v1/agent/chat` 返回正确响应 |
| 流式对话 | `POST /api/v1/agent/stream` 返回 SSE 事件流 |
| 工具调用 | Agent 自动调用 bash/read/write/http 工具 |
| MCP 集成 | MCP 工具自动加载并可调用 |
| 多轮对话 | 会话保持上下文，支持追问 |
| 错误处理 | 错误返回结构化 JSON，状态码正确 |

### 7.2 非功能验收

| 指标 | 标准 |
|------|------|
| 启动时间 | < 10s |
| API 响应时间 | < 5s (不含 LLM) |
| 测试覆盖率 | > 80% |
| 并发支持 | 100+ 并发会话 |

### 7.3 验收测试脚本

```bash
# 1. 健康检查
curl http://localhost:8080/actuator/health

# 2. 同步对话
curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, who are you?"}'

# 3. 工具调用
curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Read the file /etc/hosts"}'

# 4. 流式对话
curl -X POST http://localhost:8080/api/v1/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message": "Tell me a short story"}'

# 5. 多轮对话
SESSION_ID=$(uuidgen)
curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{"message": "My name is Alice"}'

curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{"message": "What is my name?"}'
```

---

## 8. 里程碑

| 里程碑 | 日期 | 交付物 |
|--------|------|--------|
| M1: 框架完成 | Day 2 | 可运行的空壳项目 |
| M2: 工具可用 | Day 4 | 内置工具全部可用 |
| M3: API 完成 | Day 5 | REST API 可调用 |
| M4: MCP 集成 | Day 6 | MCP 工具可调用 |
| M5: 测试完成 | Day 7 | 测试覆盖率 > 80% |
| M6: 部署就绪 | Day 8 | Docker 镜像可用 |

---

## 9. 资源需求

| 资源 | 需求 |
|------|------|
| 开发人员 | 1 人 (Java/Spring 熟练) |
| OpenAI API Key | 用于测试 |
| MCP Server | filesystem, github (可选) |
| 开发环境 | JDK 21, Maven 3.9, Docker |

---

## 10. 附录

### A. 开发环境配置

```bash
# 安装 JDK 21
sdk install java 21-tem

# 安装 Maven
sdk install maven 3.9.6

# 克隆项目
git clone <repo-url>
cd simple-agent

# 设置环境变量
export OPENAI_API_KEY=sk-xxx

# 启动开发
mvn spring-boot:run
```

### B. 常用命令

```bash
# 编译
mvn compile

# 测试
mvn test

# 打包
mvn package -DskipTests

# 运行
java -jar target/simple-agent-1.0.0-SNAPSHOT.jar

# Docker 构建
docker build -t simple-agent:1.0.0 .

# Docker 运行
docker run -e OPENAI_API_KEY=sk-xxx -p 8080:8080 simple-agent:1.0.0
```

### C. 参考链接

- [设计文档](./X003-spring-ai-agent-design.md)
- [Spring AI 官方文档](https://docs.spring.io/spring-ai/reference/)
- [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)
- [Spring AI MCP Client](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html)
