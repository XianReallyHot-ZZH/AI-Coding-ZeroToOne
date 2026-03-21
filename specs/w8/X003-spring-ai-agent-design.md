# Simple Multi-turn Agent with Spring AI - Design Specification

## 文档信息

| 项目 | 说明 |
|------|------|
| **版本** | 1.0.0 |
| **日期** | 2026-03-21 |
| **源文档** | `specs/w6/X001-simple-agent-design.md` |
| **技术栈** | Java 21 + Spring Boot 3.4 + Spring AI 1.1 + Maven 3.9 |

---

## 1. 需求概述

### 1.1 Agent 定义

Agent 是一个能够：

1. 接收用户消息
2. 调用 LLM 生成响应
3. 识别并执行工具调用
4. 将工具结果返回给 LLM
5. 循环直到任务完成

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Loop                            │
│                                                          │
│  User Input ──► LLM ──► Tool Calls? ──► Execute Tools   │
│       ▲                     │                  │         │
│       │                     ▼                  ▼         │
│       └──────── NO ◄── Continue? ◄─── Results ──┘        │
│                     │                                    │
│                     ▼ YES                                │
│                  Response                                │
└─────────────────────────────────────────────────────────┘
```

### 1.2 功能需求

| 功能 | 必须 | 说明 |
|------|:----:|------|
| Agent 循环 | ✅ | 自动处理工具调用循环 |
| 工具定义 | ✅ | 声明式定义工具 |
| 流式处理 | ✅ | 实时输出响应 |
| MCP 集成 | ✅ | 支持 MCP 工具 |
| 会话管理 | ✅ | 多轮对话支持 |
| 内置工具 | ✅ | bash/read/write/http |
| 权限系统 | ⚪ | 可选，工具调用权限控制 |
| 错误重试 | ⚪ | 可选，API 调用重试 |

### 1.3 非功能需求

- **性能**: 单次请求响应时间 < 5s (不含 LLM API)
- **并发**: 支持 100+ 并发会话
- **可用性**: 99.9% 可用性
- **可观测性**: 支持日志、指标、链路追踪

---

## 2. 技术架构

### 2.1 技术栈

| 层次 | 技术选型 | 版本 |
|------|----------|------|
| **语言** | Java | 21 LTS |
| **框架** | Spring Boot | 3.4+ |
| **AI 框架** | Spring AI | 1.1+ |
| **构建工具** | Maven | 3.9+ |
| **响应式** | Project Reactor | 3.6+ |
| **JSON** | Jackson | 内置 |
| **测试** | JUnit 5 + Spring Test | 内置 |

### 2.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ REST API    │    │ WebSocket   │    │ CLI Interface       │  │
│  │ Controller  │    │ Handler     │    │ (可选)              │  │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘  │
└─────────┼──────────────────┼─────────────────────┼──────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Service Layer                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     AgentService                             ││
│  │  ┌───────────┐  ┌───────────────┐  ┌───────────────────┐    ││
│  │  │ ChatClient│  │ ToolCallback  │  │ ChatMemory        │    ││
│  │  │ (Spring AI)│  │ Provider      │  │ (会话管理)         │    ││
│  │  └───────────┘  └───────────────┘  └───────────────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │                     │
          ▼                     ▼
┌─────────────────────┐  ┌─────────────────────────────────────────┐
│    LLM Provider     │  │              Tool Layer                  │
│  ┌───────────────┐  │  │  ┌─────────────┐  ┌─────────────────┐   │
│  │ OpenAI        │  │  │  │ Built-in    │  │ MCP Tools       │   │
│  │ ChatModel     │  │  │  │ Tools       │  │ (自动注入)       │   │
│  │ (Spring AI)   │  │  │  │ @Tool       │  │                 │   │
│  └───────────────┘  │  │  └─────────────┘  └─────────────────┘   │
└─────────────────────┘  └─────────────────────────────────────────┘
```

### 2.3 Spring AI 核心组件映射

| 原始设计 (TypeScript) | Spring AI 组件 | 说明 |
|----------------------|----------------|------|
| `Agent.run()` | `ChatClient.call()` | 同步调用 |
| `Agent.stream()` | `ChatClient.stream()` | 流式调用 |
| `ToolRegistry` | `ToolCallbackProvider` | 工具注册 |
| `ToolExecutor` | `ToolCallingManager` | 工具执行 (框架自动) |
| `Agent Loop` | `ToolCallAdvisor` | 循环控制 (框架自动) |
| `MCPClient` | MCP Client Starter | MCP 集成 |
| `Session` | `ChatMemory` | 会话管理 |

---

## 3. 核心数据结构

### 3.1 消息类型 (Java Records)

```java
// 消息角色
public enum MessageRole {
    USER, ASSISTANT, SYSTEM, TOOL
}

// 消息内容 - Sealed Interface
public sealed interface MessageContent
    permits TextContent, ToolCallContent, ToolResultContent {}

public record TextContent(String text) implements MessageContent {}

public record ToolCallContent(
    String id,
    String name,
    Map<String, Object> arguments
) implements MessageContent {}

public record ToolResultContent(
    String toolCallId,
    String result,
    boolean isError
) implements MessageContent {}

// 消息
public record Message(
    String id,
    MessageRole role,
    List<MessageContent> content,
    Instant createdAt
) {}
```

### 3.2 工具定义

Spring AI 使用 `@Tool` 注解声明式定义工具：

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

    @Tool(description = "Make HTTP request")
    public String http(
        @ToolParam(description = "HTTP method") String method,
        @ToolParam(description = "Request URL") String url,
        @ToolParam(description = "Request body", required = false) String body
    ) {
        // 实现...
    }
}
```

### 3.3 会话配置

```java
// Agent 配置
@ConfigurationProperties(prefix = "agent")
public class AgentProperties {

    private String defaultModel = "gpt-4o";
    private String systemPrompt = "You are a helpful assistant.";
    private int maxSteps = 200;
    private double temperature = 0.7;
    private int maxTokens = 4096;

    // getters, setters
}
```

### 3.4 响应类型

```java
// Agent 响应事件 - Sealed Interface
public sealed interface AgentEvent
    permits TextEvent, ToolCallEvent, ToolResultEvent, ErrorEvent, CompleteEvent {}

public record TextEvent(String text) implements AgentEvent {}

public record ToolCallEvent(String id, String name, Object args) implements AgentEvent {}

public record ToolResultEvent(String id, String name, String result, boolean isError)
    implements AgentEvent {}

public record ErrorEvent(String message, Throwable cause) implements AgentEvent {}

public record CompleteEvent(String finishReason, Usage usage) implements AgentEvent {}

public record Usage(long inputTokens, long outputTokens) {}
```

---

## 4. 核心模块设计

### 4.1 Agent 服务

```java
@Service
public class AgentService {

    private final ChatClient chatClient;
    private final AgentProperties properties;

    public AgentService(
            ChatModel chatModel,
            ToolCallbackProvider builtinTools,
            ToolCallbackProvider mcpTools,
            AgentProperties properties) {

        this.properties = properties;

        // 合并内置工具和 MCP 工具
        List<ToolCallback> allTools = new ArrayList<>();
        allTools.addAll(Arrays.asList(builtinTools.getToolCallbacks()));
        allTools.addAll(Arrays.asList(mcpTools.getToolCallbacks()));

        // 构建 ChatClient
        this.chatClient = ChatClient.builder(chatModel)
            .defaultSystem(properties.getSystemPrompt())
            .defaultToolCallbacks(allTools)
            .build();
    }

    /**
     * 同步调用
     */
    public String chat(String sessionId, String userMessage) {
        return chatClient.prompt()
            .user(userMessage)
            .advisors(advisor -> advisor
                .param(ChatMemory.CONVERSATION_ID, sessionId))
            .call()
            .content();
    }

    /**
     * 流式调用
     */
    public Flux<AgentEvent> chatStream(String sessionId, String userMessage) {
        return chatClient.prompt()
            .user(userMessage)
            .advisors(advisor -> advisor
                .param(ChatMemory.CONVERSATION_ID, sessionId))
            .stream()
            .chatResponse()
            .map(this::toAgentEvent)
            .filter(Objects::nonNull);
    }

    private AgentEvent toAgentEvent(ChatResponse response) {
        // 转换逻辑...
    }
}
```

### 4.2 会话管理 (ChatMemory)

```java
@Configuration
public class ChatMemoryConfig {

    @Bean
    public ChatMemory chatMemory() {
        // 使用内存存储 (生产环境可替换为 Redis)
        return MessageWindowChatMemory.builder()
            .maxMessages(50)  // 保留最近 50 条消息
            .build();
    }

    @Bean
    public MessageChatMemoryAdvisor chatMemoryAdvisor(ChatMemory chatMemory) {
        return MessageChatMemoryAdvisor.builder(chatMemory)
            .order(100)  // Advisor 顺序
            .build();
    }
}
```

### 4.3 内置工具实现

```java
@Component
public class BuiltinTools {

    private static final Logger log = LoggerFactory.getLogger(BuiltinTools.class);

    @Tool(description = "Execute a shell command and return the output")
    public String bash(
        @ToolParam(description = "The shell command to execute") String command,
        @ToolParam(description = "Timeout in milliseconds, default 30000", required = false) Integer timeout
    ) {
        int timeoutMs = timeout != null ? timeout : 30000;
        log.info("Executing command: {} (timeout: {}ms)", command, timeoutMs);

        try {
            ProcessBuilder pb = new ProcessBuilder();
            pb.command("sh", "-c", command);
            pb.redirectErrorStream(true);

            Process process = pb.start();
            boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Command timed out after " + timeoutMs + "ms";
            }

            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.exitValue();

            if (exitCode != 0) {
                return "Error (exit code " + exitCode + "): " + output;
            }
            return output;

        } catch (Exception e) {
            log.error("Failed to execute command: {}", command, e);
            return "Error: " + e.getMessage();
        }
    }

    @Tool(description = "Read the content of a file")
    public String readFile(
        @ToolParam(description = "The path to the file to read") String path
    ) {
        log.info("Reading file: {}", path);

        try {
            Path filePath = Path.of(path);
            if (!Files.exists(filePath)) {
                return "Error: File not found: " + path;
            }
            if (!Files.isRegularFile(filePath)) {
                return "Error: Not a regular file: " + path;
            }

            return Files.readString(filePath);

        } catch (Exception e) {
            log.error("Failed to read file: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    @Tool(description = "Write content to a file, creating parent directories if needed")
    public String writeFile(
        @ToolParam(description = "The path to the file to write") String path,
        @ToolParam(description = "The content to write to the file") String content
    ) {
        log.info("Writing file: {} ({} bytes)", path, content.length());

        try {
            Path filePath = Path.of(path);

            // 创建父目录
            Files.createDirectories(filePath.getParent());

            Files.writeString(filePath, content, StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING);

            return "Successfully wrote " + content.length() + " bytes to " + path;

        } catch (Exception e) {
            log.error("Failed to write file: {}", path, e);
            return "Error: " + e.getMessage();
        }
    }

    @Tool(description = "Make an HTTP request and return the response")
    public String http(
        @ToolParam(description = "HTTP method (GET, POST, PUT, DELETE, etc.)") String method,
        @ToolParam(description = "The URL to request") String url,
        @ToolParam(description = "Request body for POST/PUT requests", required = false) String body,
        @ToolParam(description = "Request headers in JSON format", required = false) String headers
    ) {
        log.info("HTTP {} {}", method, url);

        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(60));

            // 设置方法
            if ("GET".equalsIgnoreCase(method)) {
                requestBuilder.GET();
            } else if ("POST".equalsIgnoreCase(method)) {
                requestBuilder.POST(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
            } else if ("PUT".equalsIgnoreCase(method)) {
                requestBuilder.PUT(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
            } else if ("DELETE".equalsIgnoreCase(method)) {
                requestBuilder.DELETE();
            }

            // 添加请求头
            if (headers != null && !headers.isEmpty()) {
                ObjectMapper mapper = new ObjectMapper();
                Map<String, String> headerMap = mapper.readValue(headers, Map.class);
                headerMap.forEach(requestBuilder::header);
            }

            HttpRequest request = requestBuilder.build();
            HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            return "Status: " + response.statusCode() + "\n" + response.body();

        } catch (Exception e) {
            log.error("HTTP request failed: {} {}", method, url, e);
            return "Error: " + e.getMessage();
        }
    }
}
```

### 4.4 REST API 控制器

```java
@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    private final AgentService agentService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody ChatRequest request) {

        String sid = sessionId != null ? sessionId : UUID.randomUUID().toString();
        String response = agentService.chat(sid, request.message());

        return ResponseEntity.ok()
            .header("X-Session-Id", sid)
            .body(new ChatResponse(response));
    }

    @PostMapping("/stream")
    public Flux<ServerSentEvent<AgentEvent>> streamChat(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody ChatRequest request) {

        String sid = sessionId != null ? sessionId : UUID.randomUUID().toString();

        return agentService.chatStream(sid, request.message())
            .map(event -> ServerSentEvent.<AgentEvent>builder()
                .id(UUID.randomUUID().toString())
                .event(event.getClass().getSimpleName())
                .data(event)
                .build());
    }

    public record ChatRequest(String message) {}
    public record ChatResponse(String content) {}
}
```

---

## 5. MCP 集成

### 5.1 配置

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
          model: ${AI_MODEL:gpt-4o}
          temperature: 0.7

    mcp:
      client:
        type: SYNC
        stdio:
          servers-configuration: classpath:mcp-servers.json
        toolcallback:
          enabled: true

# Agent 配置
agent:
  default-model: gpt-4o
  system-prompt: |
    You are a helpful AI assistant with access to tools for:
    - Executing shell commands
    - Reading and writing files
    - Making HTTP requests
    - Additional tools provided via MCP

    Use these tools to help the user accomplish their tasks.
  max-steps: 200
  temperature: 0.7
  max-tokens: 4096
```

### 5.2 MCP 服务器配置

```json
// src/main/resources/mcp-servers.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "env": {}
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

### 5.3 MCP 客户端自定义 (可选)

```java
@Component
public class CustomMcpClientCustomizer implements McpSyncClientCustomizer {

    private static final Logger log = LoggerFactory.getLogger(CustomMcpClientCustomizer.class);

    @Override
    public void customize(String serverName, McpClient.SyncSpec spec) {
        log.info("Configuring MCP client for server: {}", serverName);

        spec.requestTimeout(Duration.ofSeconds(60))
            .toolsChangeConsumer(tools -> {
                log.info("Tools changed for {}: {}", serverName,
                    tools.stream().map(t -> t.name()).toList());
            })
            .progressConsumer(progress -> {
                log.info("Progress [{}]: {}", serverName, progress);
            });
    }
}
```

---

## 6. 流式处理

### 6.1 流式响应实现

```java
@Service
public class StreamingService {

    private final ChatClient chatClient;

    public Flux<AgentEvent> streamWithTools(String sessionId, String message) {
        return Flux.create(emitter -> {
            try {
                chatClient.prompt()
                    .user(message)
                    .advisors(advisor -> advisor
                        .param(ChatMemory.CONVERSATION_ID, sessionId))
                    .stream()
                    .chatResponse()
                    .subscribe(
                        response -> {
                            AgentEvent event = toAgentEvent(response);
                            if (event != null) {
                                emitter.next(event);
                            }
                        },
                        error -> {
                            emitter.next(new ErrorEvent(error.getMessage(), error));
                            emitter.complete();
                        },
                        () -> {
                            emitter.next(new CompleteEvent("stop", new Usage(0, 0)));
                            emitter.complete();
                        }
                    );
            } catch (Exception e) {
                emitter.error(e);
            }
        });
    }

    private AgentEvent toAgentEvent(ChatResponse response) {
        if (response.getResult() == null ||
            response.getResult().getOutput() == null) {
            return null;
        }

        AssistantMessage output = response.getResult().getOutput();

        // 处理文本内容
        if (output.getText() != null && !output.getText().isEmpty()) {
            return new TextEvent(output.getText());
        }

        // 处理工具调用
        // Spring AI 会自动处理工具调用，这里主要是事件通知

        return null;
    }
}
```

### 6.2 WebSocket 支持 (可选)

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(agentWebSocketHandler(), "/ws/agent")
            .setAllowedOrigins("*");
    }

    @Bean
    public AgentWebSocketHandler agentWebSocketHandler() {
        return new AgentWebSocketHandler();
    }
}

@Component
public class AgentWebSocketHandler extends TextWebSocketHandler {

    private final AgentService agentService;
    private final ObjectMapper objectMapper;

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        ChatRequest request = objectMapper.readValue(message.getPayload(), ChatRequest.class);
        String sessionId = session.getId();

        agentService.chatStream(sessionId, request.message())
            .doOnNext(event -> {
                try {
                    String json = objectMapper.writeValueAsString(event);
                    session.sendMessage(new TextMessage(json));
                } catch (Exception e) {
                    log.error("Failed to send message", e);
                }
            })
            .doOnComplete(() -> {
                try {
                    session.sendMessage(new TextMessage("[DONE]"));
                } catch (Exception e) {
                    log.error("Failed to send completion", e);
                }
            })
            .subscribe();
    }
}
```

---

## 7. 错误处理

### 7.1 全局异常处理

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unhandled exception", e);

        ErrorResponse error = new ErrorResponse(
            "INTERNAL_ERROR",
            e.getMessage(),
            Instant.now()
        );

        return ResponseEntity.status(500).body(error);
    }

    @ExceptionHandler(ToolExecutionException.class)
    public ResponseEntity<ErrorResponse> handleToolExecution(ToolExecutionException e) {
        log.warn("Tool execution failed: {}", e.getMessage());

        ErrorResponse error = new ErrorResponse(
            "TOOL_EXECUTION_ERROR",
            e.getMessage(),
            Instant.now()
        );

        return ResponseEntity.status(400).body(error);
    }

    public record ErrorResponse(String code, String message, Instant timestamp) {}
}
```

### 7.2 工具执行异常处理

```java
@Component
public class ToolExecutionExceptionProcessor
        implements org.springframework.ai.tool.execution.ToolExecutionExceptionProcessor {

    @Override
    public String process(ToolExecutionException exception) {
        // 将工具执行异常转换为友好的错误消息
        return "Tool execution failed: " + exception.getMessage();
    }
}
```

---

## 8. 可观测性

### 8.1 日志配置

```yaml
# application.yml
logging:
  level:
    root: INFO
    com.example.agent: DEBUG
    org.springframework.ai: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

### 8.2 指标配置

```java
@Configuration
public class MetricsConfig {

    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
            .commonTags("application", "simple-agent");
    }
}

@Service
public class AgentMetrics {

    private final MeterRegistry meterRegistry;
    private final Counter requestCounter;
    private final Timer requestTimer;

    public AgentMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.requestCounter = Counter.builder("agent.requests")
            .description("Total agent requests")
            .register(meterRegistry);
        this.requestTimer = Timer.builder("agent.request.duration")
            .description("Agent request duration")
            .register(meterRegistry);
    }

    public void recordRequest(String model, boolean success) {
        requestCounter.increment();
        // ...
    }
}
```

### 8.3 健康检查

```java
@Component
public class AgentHealthIndicator implements HealthIndicator {

    private final ChatModel chatModel;

    @Override
    public Health health() {
        try {
            // 简单的健康检查
            chatModel.call(new Prompt("ping"));
            return Health.up()
                .withDetail("status", "LLM connection healthy")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}
```

---

## 9. 测试

### 9.1 单元测试

```java
@SpringBootTest
class AgentServiceTest {

    @Autowired
    private AgentService agentService;

    @Test
    void testChat() {
        String response = agentService.chat("test-session", "Hello, who are you?");

        assertThat(response).isNotEmpty();
        assertThat(response).containsIgnoringCase("assistant");
    }

    @Test
    void testChatStream() {
        StepVerifier.create(
            agentService.chatStream("test-session", "Count from 1 to 5")
        )
        .expectNextMatches(event -> event instanceof TextEvent)
        .expectNextMatches(event -> event instanceof CompleteEvent)
        .verifyComplete();
    }
}
```

### 9.2 工具测试

```java
@SpringBootTest
class BuiltinToolsTest {

    @Autowired
    private BuiltinTools builtinTools;

    @Test
    void testReadFile() {
        String result = builtinTools.readFile("src/test/resources/test.txt");
        assertThat(result).contains("test content");
    }

    @Test
    void testBashCommand() {
        String result = builtinTools.bash("echo 'hello world'", 5000);
        assertThat(result).contains("hello world");
    }
}
```

### 9.3 集成测试

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AgentControllerIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void testChatEndpoint() {
        webTestClient.post()
            .uri("/api/v1/agent/chat")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(new ChatRequest("What is 2+2?"))
            .exchange()
            .expectStatus().isOk()
            .expectBody(ChatResponse.class)
            .value(response -> {
                assertThat(response.content()).isNotEmpty();
            });
    }
}
```

---

## 10. 项目结构

```
simple-agent/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/agent/
│   │   │       ├── AgentApplication.java
│   │   │       ├── config/
│   │   │       │   ├── AgentProperties.java
│   │   │       │   ├── ChatMemoryConfig.java
│   │   │       │   └── MetricsConfig.java
│   │   │       ├── controller/
│   │   │       │   └── AgentController.java
│   │   │       ├── service/
│   │   │       │   ├── AgentService.java
│   │   │       │   └── StreamingService.java
│   │   │       ├── tool/
│   │   │       │   ├── BuiltinTools.java
│   │   │       │   └── ToolExecutionExceptionProcessor.java
│   │   │       ├── types/
│   │   │       │   ├── Message.java
│   │   │       │   ├── MessageContent.java
│   │   │       │   └── AgentEvent.java
│   │   │       ├── exception/
│   │   │       │   └── GlobalExceptionHandler.java
│   │   │       └── mcp/
│   │   │           └── CustomMcpClientCustomizer.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── mcp-servers.json
│   └── test/
│       └── java/
│           └── com/example/agent/
│               ├── AgentServiceTest.java
│               ├── BuiltinToolsTest.java
│               └── AgentControllerIntegrationTest.java
└── README.md
```

---

## 11. 依赖配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>simple-agent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <name>Simple Agent</name>
    <description>Multi-turn Agent with Spring AI</description>

    <properties>
        <java.version>21</java.version>
        <spring-ai.version>1.1.0</spring-ai.version>
    </properties>

    <dependencies>
        <!-- Spring Boot -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Spring AI -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
            <version>${spring-ai.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-mcp-client-spring-boot-starter</artifactId>
            <version>${spring-ai.version}</version>
        </dependency>

        <!-- Lombok (可选) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.projectreactor</groupId>
            <artifactId>reactor-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>

</project>
```

---

## 12. 运行与部署

### 12.1 本地运行

```bash
# 设置环境变量
export OPENAI_API_KEY=your-api-key

# 运行
mvn spring-boot:run

# 或打包后运行
mvn package
java -jar target/simple-agent-1.0.0-SNAPSHOT.jar
```

### 12.2 Docker 部署

```dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY target/simple-agent-1.0.0-SNAPSHOT.jar app.jar

ENV OPENAI_API_KEY=""
ENV JAVA_OPTS="-Xms256m -Xmx512m"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

```bash
docker build -t simple-agent:1.0.0 .
docker run -e OPENAI_API_KEY=your-key -p 8080:8080 simple-agent:1.0.0
```

### 12.3 API 使用示例

```bash
# 同步调用
curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in Tokyo?"}'

# 流式调用
curl -X POST http://localhost:8080/api/v1/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message": "Tell me a story"}'
```

---

## 13. 参考资料

- [Spring AI 官方文档](https://docs.spring.io/spring-ai/reference/)
- [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)
- [Spring AI MCP Client](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Java 21 Virtual Threads](https://openjdk.org/jeps/444)
