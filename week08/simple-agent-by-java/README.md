# Simple Agent by Java

基于 Spring AI 的多轮对话 Agent 实现。

## 技术栈

| 组件 | 版本 |
|------|------|
| Java | 17 |
| Spring Boot | 3.5.12 |
| Spring AI | 1.1.3 |

## 功能特性

- **多轮对话**: 支持会话记忆
- **工具调用**: 内置 bash, readFile, writeFile, http 等工具
- **MCP 集成**: 支持 MCP 工具扩展
- **流式响应**: SSE 流式输出
- **可观测性**: Actuator + Micrometer 指标

## 快速开始

### 环境要求

- JDK 17+
- Maven 3.9+

### 配置

```bash
# 设置 OpenAI API Key
export OPENAI_API_KEY=your-api-key

# 可选：设置自定义 Base URL
export OPENAI_BASE_URL=https://api.openai.com

# 可选：设置模型
export AI_MODEL=gpt-4o
```

### 运行

```bash
# 编译
mvn package -DskipTests

# 运行
java -jar target/simple-agent-1.0.0-SNAPSHOT.jar
```

## API 端点

### 同步对话

```bash
curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: test-session" \
  -d '{"message": "Hello, who are you?"}'
```

### 流式对话

```bash
curl -X POST http://localhost:8080/api/v1/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Session-Id: test-session" \
  -d '{"message": "Tell me a story"}'
```

### 获取工具列表

```bash
curl http://localhost:8080/api/v1/agent/tools
```

### 清除会话记忆

```bash
curl -X DELETE http://localhost:8080/api/v1/agent/session/test-session
```

### 健康检查

```bash
curl http://localhost:8080/api/v1/agent/health
```

## Docker 部署

```bash
# 构建镜像
docker build -t simple-agent:1.0.0 .

# 运行容器
docker run -d \
  -e OPENAI_API_KEY=your-api-key \
  -p 8080:8080 \
  simple-agent:1.0.0
```

### Docker Compose

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down
```

## 配置选项

| 配置项 | 环境变量 | 默认值 |
|--------|----------|--------|
| API Key | OPENAI_API_KEY | - |
| Base URL | OPENAI_BASE_URL | https://api.openai.com |
| Model | AI_MODEL | gpt-4o |
| MCP Enabled | MCP_ENABLED | true |

## 项目结构

```
simple-agent-by-java/
├── src/main/java/com/example/agent/
│   ├── AgentApplication.java
│   ├── config/
│   │   ├── AgentProperties.java
│   │   ├── ChatMemoryConfig.java
│   │   └── ToolConfig.java
│   ├── controller/
│   │   └── AgentController.java
│   ├── exception/
│   │   └── GlobalExceptionHandler.java
│   ├── mcp/
│   │   └── McpClientConfig.java
│   ├── metrics/
│   │   ├── AgentHealthIndicator.java
│   │   └── AgentMetrics.java
│   ├── service/
│   │   └── AgentService.java
│   ├── tool/
│   │   └── BuiltinTools.java
│   └── types/
│       ├── AgentEvent.java
│       ├── CompleteEvent.java
│       ├── TextEvent.java
│       └── Usage.java
├── src/main/resources/
│   ├── application.yml
│   └── mcp-servers.json
├── Dockerfile
├── docker-compose.yml
└── pom.xml
```

## License

MIT
