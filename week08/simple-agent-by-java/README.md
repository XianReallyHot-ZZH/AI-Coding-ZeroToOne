# Simple Agent by Java

基于 Spring AI 的多轮对话 Agent 实现。

## 技术栈

| 组件          | 版本     |
| ----------- | ------ |
| Java        | 17     |
| Spring Boot | 3.5.12 |
| Spring AI   | 1.1.3  |

## 功能特性

- **多模型支持**: OpenAI、DeepSeek 等兼容 API
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

#### 使用 OpenAI

```bash
export OPENAI_API_KEY=sk-xxx
export OPENAI_BASE_URL=https://api.openai.com
export AI_MODEL=gpt-4o
```

#### 使用 DeepSeek

```bash
export OPENAI_API_KEY=sk-xxx  # DeepSeek API Key
export OPENAI_BASE_URL=https://api.deepseek.com
export AI_MODEL=deepseek-chat
```

### 运行

```bash
# 编译
mvn package -DskipTests

# 运行
java -jar target/simple-agent-1.0.0-SNAPSHOT.jar
```

## 支持的模型

### OpenAI

| 模型            | 说明           |
| ------------- | ------------ |
| gpt-4o        | 最新多模态模型 (默认) |
| gpt-4-turbo   | GPT-4 Turbo  |
| gpt-3.5-turbo | 快速模型         |

### DeepSeek

| 模型                | 说明        |
| ----------------- | --------- |
| deepseek-chat     | 通用对话模型    |
| deepseek-coder    | 代码专用模型    |
| deepseek-reasoner | 推理模型 (R1) |

## API 端点

### 同步对话

```bash
curl -X POST http://localhost:8080/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: test-session" \
  -d '{"message": "Hello, who are you?"}'
```

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/agent/chat" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "X-Session-Id"="test-session"} `
  -Body '{"message": "Hello, who are you?"}'
```

### 流式对话

```bash
curl -X POST http://localhost:8080/api/v1/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Session-Id: test-session" \
  -d '{"message": "Tell me a story"}'
```

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/agent/stream" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "Accept"="text/event-stream"; "X-Session-Id"="test-session"} `
  -Body '{"message": "Tell me a story"}' -UseBasicParsing

curl.exe -X POST http://localhost:8080/api/v1/agent/stream -H "Content-Type: application/json" -H "Accept: text/event-stream" -H "X-Session-Id: test-session" -d '{\"message\": \"讲一个笑话\"}'  
```

### 获取工具列表

```bash
curl http://localhost:8080/api/v1/agent/tools
```

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/agent/tools" -Method GET
```

### 清除会话记忆

```bash
curl -X DELETE http://localhost:8080/api/v1/agent/session/test-session
```

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/agent/session/test-session" -Method DELETE
```

### 健康检查

```bash
curl http://localhost:8080/api/v1/agent/health
```

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/agent/health" -Method GET
```

## Docker 部署

### 使用 OpenAI

```bash
docker run -d \
  -e OPENAI_API_KEY=sk-xxx \
  -e OPENAI_BASE_URL=https://api.openai.com \
  -e AI_MODEL=gpt-4o \
  -p 8080:8080 \
  simple-agent:1.0.0
```

### 使用 DeepSeek

```bash
docker run -d \
  -e OPENAI_API_KEY=sk-xxx \
  -e OPENAI_BASE_URL=https://api.deepseek.com \
  -e AI_MODEL=deepseek-chat \
  -p 8080:8080 \
  simple-agent:1.0.0
```

### Docker Compose

```bash
# 创建 .env 文件
cat > .env << EOF
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
EOF

# 启动
docker-compose up -d

# 停止
docker-compose down
```

## 配置选项

| 配置项         | 环境变量              | 默认值                      |
| ----------- | ----------------- | ------------------------ |
| API Key     | OPENAI\_API\_KEY  | -                        |
| Base URL    | OPENAI\_BASE\_URL | <https://api.openai.com> |
| Model       | AI\_MODEL         | gpt-4o                   |
| MCP Enabled | MCP\_ENABLED      | false                    |
| Server Port | SERVER\_PORT      | 8080                     |

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
