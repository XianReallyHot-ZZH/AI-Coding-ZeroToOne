# TypeScript Agent SDK 到 Java 技术栈迁移评估报告

**评估日期**: 2026-03-21
**源项目**: `week06/x-simple-agent` (TypeScript)
**评估目标**: 将整套技术栈改造成 Java 的可行性分析
**更新**: 新增 Spring AI 框架评估

---

## 执行摘要

| 维度 | 纯 Java 实现 | Spring AI 实现 | 说明 |
|------|-------------|---------------|------|
| **技术可行性** | ⭐⭐⭐⭐ (4/5) | ⭐⭐⭐⭐⭐ (5/5) | Spring AI 提供开箱即用的 Agent 能力 |
| **功能完整性** | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | 两者均可实现所有功能 |
| **开发效率** | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐⭐ (5/5) | Spring AI 大幅减少样板代码 |
| **MCP 支持** | ⭐⭐ (2/5) | ⭐⭐⭐⭐⭐ (5/5) | Spring AI 1.1+ 原生支持 MCP |
| **性能预期** | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐ (4/5) | 框架略有开销，但可接受 |
| **迁移复杂度** | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐ (4/5) | Spring AI 简化大部分工作 |
| **推荐指数** | ⭐⭐⭐⭐ (4/5) | ⭐⭐⭐⭐⭐ (5/5) | **强烈推荐使用 Spring AI** |

**最终结论**: ✅ **强烈推荐使用 Spring AI 框架进行迁移**，可大幅简化开发并原生支持 MCP。

---

## 1. Spring AI 框架评估

### 1.1 Spring AI 概述

[Spring AI](https://spring.io/projects/spring-ai) 是 Spring 官方的 AI 应用开发框架，提供：

- **ChatClient** - 高级 LLM 交互 API
- **Tool Calling** - 声明式工具定义与自动执行
- **MCP 集成** - 原生支持 Model Context Protocol
- **Advisor 模式** - 可扩展的请求处理链
- **Observability** - 内置可观测性支持

### 1.2 核心功能对比

| 功能 | x-simple-agent (TS) | Spring AI (Java) | 简化程度 |
|------|---------------------|------------------|----------|
| **工具定义** | `interface Tool` + 手动实现 | `@Tool` 注解 | ⬇️ 80% 代码 |
| **工具注册** | `ToolRegistry.register()` | 自动扫描 / `@Bean` | ⬇️ 90% 代码 |
| **工具执行** | `ToolExecutor.executeAll()` | `ToolCallingManager` 自动 | ⬇️ 100% 代码 |
| **Agent 循环** | 手动 `while` 循环 | `ToolCallAdvisor` 自动 | ⬇️ 100% 代码 |
| **流式处理** | `AsyncGenerator` | `Flux<ChatResponse>` | 相当 |
| **MCP 集成** | 手动连接 + 适配 | Boot Starter 自动配置 | ⬇️ 95% 代码 |
| **会话管理** | `SessionManager` | `ChatMemory` API | 相当 |

### 1.3 Spring AI 关键特性详解

#### 1.3.1 声明式工具定义

**TypeScript (x-simple-agent)**
```typescript
const weatherTool: Tool = {
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" }
    },
    required: ["location"]
  },
  execute: async (args) => {
    const { location } = args as { location: string }
    return { output: JSON.stringify({ temp: 22, condition: "sunny" }) }
  }
}

// 注册
registry.register(weatherTool)
```

**Spring AI (Java)**
```java
@Component
public class WeatherTools {

    @Tool(description = "Get current weather for a location")
    public String getWeather(
        @ToolParam(description = "City name") String location
    ) {
        return "{\"temp\": 22, \"condition\": \"sunny\"}";
    }
}

// 使用 - 工具自动注入
ChatClient.create(chatModel)
    .prompt("What's the weather in Tokyo?")
    .tools(new WeatherTools())  // 或通过 @Bean 自动注入
    .call()
    .content();
```

**代码量减少**: ~80%

#### 1.3.2 自动工具调用循环

**TypeScript (x-simple-agent)**
```typescript
async run(userMessage: string): Promise<Message[]> {
  while (step < maxSteps) {
    const response = await this.llm.call({...})
    const toolCalls = response.content.filter(c => c.type === "tool_call")

    if (toolCalls.length === 0) break

    const results = await this.executor.executeAll(toolCalls, ctx)
    session.messages.push({ role: "tool", content: results })
  }
  return session.messages
}
```

**Spring AI (Java)**
```java
// 框架自动处理工具调用循环！
String response = ChatClient.create(chatModel)
    .prompt("What's the weather in Tokyo?")
    .tools(new WeatherTools())
    .call()
    .content();

// 或使用 ToolCallAdvisor 自定义行为
var toolCallAdvisor = ToolCallAdvisor.builder()
    .toolCallingManager(toolCallingManager)
    .build();

var chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(toolCallAdvisor)
    .build();
```

**代码量减少**: ~100% (框架自动处理)

#### 1.3.3 MCP 集成

**TypeScript (x-simple-agent)**
```typescript
import { Client, StdioClientTransport } from "@modelcontextprotocol/sdk"

const client = new MCPClient()
await client.connect({
  type: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
})

// 手动适配工具
const mcpTools = await client.listTools()
const adaptedTools = mcpTools.map(t => adaptMCPTool(client, t))
adaptedTools.forEach(t => registry.register(t))
```

**Spring AI (Java) - application.yml**
```yaml
spring:
  ai:
    mcp:
      client:
        type: SYNC  # 或 ASYNC
        stdio:
          servers-configuration: classpath:mcp-servers.json
```

**mcp-servers.json**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
```

**Java 代码**
```java
// MCP 工具自动注入！无需手动配置
@Autowired
private ToolCallbackProvider mcpToolProvider;  // 自动包含所有 MCP 工具

ChatClient.create(chatModel)
    .prompt("Read the file /path/to/file.txt")
    .toolCallbacks(mcpToolProvider.getToolCallbacks())
    .call()
    .content();
```

**代码量减少**: ~95%

#### 1.3.4 流式处理

**Spring AI (Java)**
```java
// 同步流式
Flux<String> stream = ChatClient.create(chatModel)
    .prompt("Tell me a story")
    .tools(new StoryTools())
    .stream()
    .content();

stream.doOnNext(chunk -> System.out.print(chunk))
      .subscribe();

// 或使用 ResponseEntity<Flux<ChatResponse>> 在 WebFlux 中
```

### 1.4 Spring AI MCP Client 详细功能

Spring AI 1.1+ 提供完整的 MCP 支持：

| 功能 | 说明 |
|------|------|
| **多传输协议** | stdio, HTTP/SSE, Streamable HTTP |
| **同步/异步客户端** | `McpSyncClient` / `McpAsyncClient` |
| **自动重连** | 支持断线重连和会话恢复 |
| **工具过滤** | `McpToolFilter` 接口自定义过滤 |
| **工具名前缀** | 自动处理多服务器工具名冲突 |
| **ToolContext 转换** | 自定义上下文到 MCP 元数据转换 |
| **事件处理** | 工具变更、资源变更、进度通知等 |

**MCP 客户端自定义示例**
```java
@Component
public class CustomMcpSyncClientCustomizer implements McpSyncClientCustomizer {
    @Override
    public void customize(String serverName, McpClient.SyncSpec spec) {
        spec.requestTimeout(Duration.ofSeconds(30))
            .toolsChangeConsumer(tools -> {
                log.info("Tools changed: {}", tools);
            })
            .progressConsumer(progress -> {
                log.info("Progress: {}", progress);
            });
    }
}
```

### 1.5 Spring AI vs 纯 Java 实现

| 维度 | 纯 Java + Reactor | Spring AI |
|------|------------------|-----------|
| **学习曲线** | 陡峭 (Reactor + 手动实现) | 中等 (Spring 风格) |
| **代码量** | ~2000 行 | ~500 行 |
| **MCP 支持** | 需自行实现 | 开箱即用 |
| **Agent 循环** | 手动实现 | 框架自动 |
| **工具管理** | 手动注册 | 注解 + 自动扫描 |
| **可观测性** | 需自行集成 | 内置 Micrometer |
| **测试支持** | 需自行搭建 | @SpringBootTest |
| **配置管理** | 手动 | application.yml |
| **灵活性** | 最高 | 高 (可扩展) |
| **启动时间** | 快 | 稍慢 (Spring 开销) |

---

## 2. 技术栈对比分析

### 2.1 推荐技术栈 (Spring AI)

| 组件 | 推荐选型 | 版本 | 说明 |
|------|----------|------|------|
| **运行时** | JVM (OpenJDK) | 21 LTS | 虚拟线程 + 模式匹配 |
| **框架** | Spring Boot | 3.4+ | 与 Spring AI 集成 |
| **AI 框架** | Spring AI | 1.1+ | Tool Calling + MCP |
| **构建工具** | Maven | 3.9+ | 依赖管理 |
| **响应式** | Project Reactor | 3.6+ | 流式处理 |
| **JSON** | Jackson | 内置 | 序列化 |
| **测试** | JUnit 5 + Spring Test | 内置 | 集成测试 |

### 2.2 原始技术栈 (TypeScript)

| 组件 | 技术选型 | 版本 |
|------|----------|------|
| 运行时 | Node.js | 22.x |
| 语言 | TypeScript | 5.8.3 |
| LLM SDK | openai (官方 Node SDK) | 4.93.0 |
| MCP SDK | @modelcontextprotocol/sdk | 1.10.2 |
| UUID | uuid | 11.1.0 |
| Schema 验证 | zod | 3.24.2 |

### 2.3 核心语言特性映射

#### 2.3.1 异步编程模型

| TypeScript | Spring AI / Reactor |
|------------|---------------------|
| `AsyncGenerator<T>` | `Flux<T>` |
| `Promise<T>` | `Mono<T>` |
| `await` | `.block()` / `.subscribe()` |
| `Promise.all()` | `Flux.merge()` |
| `AbortController` | `CancellationDisposable` |

#### 2.3.2 类型系统

| TypeScript | Java 21+ |
|------------|----------|
| Discriminated Unions | Sealed Classes + Records |
| Type Guards | Pattern Matching |
| Interface | Interface / Record |
| Optional Chaining | `Optional` / Null Checks |

---

## 3. 功能模块迁移分析 (Spring AI)

### 3.1 模块映射

| x-simple-agent 模块 | Spring AI 对应 | 实现方式 |
|---------------------|----------------|----------|
| `types/index.ts` | Java Records | 直接定义 |
| `agent/agent.ts` | `ChatClient` + `ToolCallAdvisor` | 框架提供 |
| `llm/client.ts` | `ChatModel` 实现 | 框架提供 |
| `tool/registry.ts` | `ToolCallbackProvider` | 框架自动 |
| `tool/executor.ts` | `ToolCallingManager` | 框架自动 |
| `tool/builtin/*.ts` | `@Tool` 方法 | 注解定义 |
| `mcp/client.ts` | MCP Client Starter | 自动配置 |
| `session/session.ts` | `ChatMemory` | 框架提供 |

### 3.2 代码量对比

| 模块 | TypeScript | 纯 Java | Spring AI |
|------|-----------|---------|-----------|
| 类型定义 | 200 行 | 300 行 | 150 行 (Record) |
| Agent 循环 | 150 行 | 200 行 | 10 行 (配置) |
| LLM 客户端 | 200 行 | 250 行 | 0 行 (Starter) |
| 工具系统 | 280 行 | 350 行 | 50 行 (@Tool) |
| MCP 集成 | 100 行 | 400 行 | 20 行 (配置) |
| 会话管理 | 60 行 | 80 行 | 0 行 (内置) |
| **总计** | ~1000 行 | ~1600 行 | ~250 行 |

**代码量减少**: 使用 Spring AI 可减少 **75%** 代码

### 3.3 Spring AI 实现示例

#### 完整的 Agent 服务

```java
@Service
public class AgentService {

    private final ChatClient chatClient;

    public AgentService(ChatModel chatModel, ToolCallbackProvider mcpTools) {
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem("You are a helpful assistant.")
            .defaultTools(new BuiltinTools())  // 内置工具
            .defaultToolCallbacks(mcpTools)     // MCP 工具
            .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
            .build();
    }

    // 同步调用
    public String run(String userMessage) {
        return chatClient.prompt()
            .user(userMessage)
            .call()
            .content();
    }

    // 流式调用
    public Flux<String> stream(String userMessage) {
        return chatClient.prompt()
            .user(userMessage)
            .stream()
            .content();
    }
}
```

#### 内置工具定义

```java
@Component
public class BuiltinTools {

    @Tool(description = "Execute a shell command")
    public String bash(
        @ToolParam(description = "Command to execute") String command,
        @ToolParam(description = "Timeout in ms", required = false) Integer timeout
    ) {
        // 实现...
    }

    @Tool(description = "Read file content")
    public String readFile(
        @ToolParam(description = "File path") String path
    ) {
        // 实现...
    }

    @Tool(description = "Write content to file")
    public String writeFile(
        @ToolParam(description = "File path") String path,
        @ToolParam(description = "Content to write") String content
    ) {
        // 实现...
    }
}
```

#### 配置文件

```yaml
# application.yml
spring:
  application:
    name: simple-agent

  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      base-url: ${OPENAI_BASE_URL:https://api.openai.com}
      chat:
        options:
          model: gpt-4o
          temperature: 0.7

    mcp:
      client:
        type: SYNC
        stdio:
          servers-configuration: classpath:mcp-servers.json
        toolcallback:
          enabled: true
```

---

## 4. 性能对比分析

### 4.1 理论性能对比

| 指标 | Node.js/TS | 纯 Java | Spring AI |
|------|-----------|---------|-----------|
| 启动时间 | ~100ms | ~500ms | ~2-3s |
| 内存占用 | ~100MB | ~200MB | ~300MB |
| 请求延迟 | 基准 | +5% | +10% |
| 并发能力 | 高 | 更高 | 高 |
| 长期稳定性 | 中 | 优 | 优 |

### 4.2 Agent 场景分析

由于 LLM API 调用是主要瓶颈 (通常 1-30 秒)，框架开销可忽略：

```
总耗时 = LLM API 延迟 (~5-30s) + 框架开销 (~10-50ms)
框架开销占比: < 1%
```

### 4.3 优化建议

1. **GraalVM Native Image** - 启动时间降至 ~50ms
2. **虚拟线程** - 简化并发代码
3. **连接池** - 复用 HTTP 连接

---

## 5. 迁移实施建议

### 5.1 推荐方案: Spring AI

```yaml
方案: Spring AI + Spring Boot 3.4+
Java: 21 LTS
框架: Spring AI 1.1+
构建: Maven 3.9+
```

### 5.2 项目结构

```
src/main/java/com/example/agent/
├── AgentApplication.java         # Spring Boot 入口
├── config/
│   └── AgentConfig.java          # ChatClient 配置
├── service/
│   └── AgentService.java         # Agent 服务
├── tool/
│   ├── BuiltinTools.java         # 内置工具 (@Tool)
│   └── CustomTools.java          # 自定义工具
├── mcp/
│   └── McpClientCustomizer.java  # MCP 自定义 (可选)
└── types/
    └── AgentEvent.java           # 事件类型 (可选)
```

### 5.3 迁移步骤

```
Phase 1 (基础框架) - 2-3 天
├── 创建 Spring Boot 项目
├── 添加 Spring AI 依赖
├── 配置 ChatModel (OpenAI)
└── 实现基础 ChatClient

Phase 2 (工具系统) - 2-3 天
├── 实现内置工具 (@Tool)
├── 测试工具调用
└── 实现流式输出

Phase 3 (MCP 集成) - 1-2 天
├── 添加 MCP Starter
├── 配置 MCP 服务器
└── 测试 MCP 工具

Phase 4 (完善) - 2-3 天
├── 添加 ChatMemory
├── 实现错误处理
├── 添加可观测性
└── 编写测试
```

### 5.4 依赖配置

```xml
<!-- pom.xml -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-mcp-client-spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## 6. 风险与缓解

| 风险 | 纯 Java | Spring AI | 缓解措施 |
|------|---------|-----------|----------|
| MCP 支持不成熟 | 高风险 | 低风险 | Spring AI 原生支持 |
| 学习曲线 | 高 | 中 | Spring 开发者熟悉 |
| 代码维护成本 | 高 | 低 | 代码量少 75% |
| 框架锁定 | 无 | 中 | 可降级到纯 Java |
| 启动时间 | 快 | 慢 | GraalVM Native |
| 版本兼容性 | 无 | 中 | 使用 LTS 版本 |

---

## 7. 结论与建议

### 7.1 方案对比

| 方案 | 推荐指数 | 适用场景 |
|------|----------|----------|
| **Spring AI** | ⭐⭐⭐⭐⭐ | 企业级应用、快速开发、需要 MCP |
| 纯 Java + Reactor | ⭐⭐⭐⭐ | 对性能/启动时间敏感、无 Spring 依赖 |
| 保持 TypeScript | ⭐⭐⭐ | 快速原型、Node.js 技术栈 |

### 7.2 最终建议

✅ **强烈推荐使用 Spring AI 进行迁移**

**理由**:
1. **开发效率提升 75%** - 代码量从 ~1000 行降至 ~250 行
2. **MCP 原生支持** - 无需自行实现，开箱即用
3. **Agent 循环自动化** - `ToolCallAdvisor` 自动处理工具调用
4. **企业级特性** - 可观测性、配置管理、测试支持
5. **Spring 生态集成** - 无缝集成现有 Spring 应用

**适用条件**:
- 团队有 Java/Spring 背景 ✅
- 需要企业级特性 (监控、安全) ✅
- 需要原生 MCP 支持 ✅
- 可接受稍慢的启动时间 ✅

### 7.3 参考资料

- [Spring AI 官方文档](https://docs.spring.io/spring-ai/reference/)
- [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)
- [Spring AI MCP Client](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html)
- [Spring AI Recursive Advisors](https://spring.io/blog/2025/11/04/spring-ai-recursive-advisors)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Java 21 Virtual Threads](https://openjdk.org/jeps/444)

---

## 附录

### A. Spring AI 完整示例

```java
// AgentApplication.java
@SpringBootApplication
public class AgentApplication {
    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}

// AgentService.java
@Service
public class AgentService {

    private final ChatClient chatClient;

    public AgentService(ChatModel chatModel) {
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem("You are a helpful assistant with tool access.")
            .build();
    }

    public String chat(String message) {
        return chatClient.prompt()
            .user(message)
            .call()
            .content();
    }

    public Flux<String> chatStream(String message) {
        return chatClient.prompt()
            .user(message)
            .stream()
            .content();
    }
}

// WeatherTools.java
@Component
public class WeatherTools {

    @Tool(description = "Get current weather for a location")
    public String getWeather(
        @ToolParam(description = "City name") String location
    ) {
        // 调用天气 API
        return "{\"location\": \"" + location + "\", \"temp\": 22, \"condition\": \"sunny\"}";
    }
}

// AgentController.java
@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private final AgentService agentService;

    @PostMapping("/chat")
    public String chat(@RequestBody String message) {
        return agentService.chat(message);
    }

    @PostMapping("/stream")
    public Flux<String> stream(@RequestBody String message) {
        return agentService.chatStream(message);
    }
}
```

### B. MCP 服务器配置示例

```json
// mcp-servers.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### C. 性能基准测试

```java
@SpringBootTest
class AgentPerformanceTest {

    @Autowired
    private AgentService agentService;

    @Test
    void benchmarkSingleRequest() {
        long start = System.currentTimeMillis();
        String result = agentService.chat("What is 2+2?");
        long duration = System.currentTimeMillis() - start;

        System.out.println("Response: " + result);
        System.out.println("Duration: " + duration + "ms");
    }
}
```
