# GenSlides Backend — Development Guidelines

## Tech Stack

- Python 3.12+, FastAPI, Uvicorn
- google-genai SDK (Gemini API)
- Pillow (image processing)
- Pydantic v2 (data validation)
- python-dotenv (env config)

## Architecture

三层分离，单向依赖：`routes → services → storage`，禁止反向引用。

```
app/
├── api/routes.py        # API 层：HTTP 端点定义，参数校验，响应格式化
├── services/            # 业务层：核心逻辑，Gemini API 调用，并发控制
│   ├── splitter.py      # 内容拆分（Gemini 文本）
│   ├── generator.py     # 图片生成（Nano Banana Pro + SSE）
│   └── style.py         # 风格图片上传/压缩
├── models/schemas.py    # Pydantic 模型：请求体/响应体/内部数据结构
├── storage/             # 存储层：文件系统读写
│   ├── images.py        # 生成图片的保存/读取
│   └── styles.py        # 风格参考图片的保存/读取
└── deps.py              # 依赖注入：服务实例的创建和生命周期管理
```

## Design Principles

### SOLID
- **S**: 每个 service 只做一件事 — splitter 拆分、generator 生成、style 管理风格
- **O**: 新增风格预设或分辨率选项时，扩展枚举/配置，不改已有逻辑
- **L**: storage 层的 ImageStorage 和 StyleStorage 可互换使用相同的文件操作接口
- **I**: routes 只依赖它需要的 service，不引入无关依赖
- **D**: routes 通过 deps.py 获取 service 实例，不直接 new；service 通过构造函数注入 storage

### YAGNI
- 不提前实现数据库存储，当前用文件系统足够
- 不做用户认证，这是本地单用户工具
- 不做 i18n，当前只需中文

### KISS
- 内存中维护 slides 状态（list[SlideItem]），不引入 Redis/SQLite
- 配置用环境变量 + .env，不搞 YAML 配置体系
- SSE 用 FastAPI StreamingResponse，不引入 WebSocket

## Concurrency

- 图片生成使用 `asyncio.Semaphore(MAX_CONCURRENT)` 控制并发，默认 3
- 所有 Gemini API 调用走 async，不阻塞事件循环
- `asyncio.as_completed` 实现"谁先完成谁先推送"的 SSE 流
- Semaphore 值通过 `MAX_CONCURRENT` 环境变量可调，适配不同 API 速率限制

```python
# 并发模式
semaphore = asyncio.Semaphore(max_concurrent)

async def generate_one(slide):
    async with semaphore:
        return await call_gemini_api(slide)

tasks = [generate_one(s) for s in slides]
for coro in asyncio.as_completed(tasks):
    result = await coro
    yield sse_event(result)
```

## Error Handling

- **API 层**: 使用 FastAPI 的 HTTPException，返回标准 `{"detail": "..."}` 格式
- **Service 层**: 抛出业务异常（ValueError, RuntimeError），由 routes 捕获转 HTTP 错误码
- **Storage 层**: 抛出 FileNotFoundError，由 routes 转 404
- **Gemini API 失败**: 单页失败不中断批量生成，通过 SSE 推送 error 事件，前端显示重试按钮
- **参数校验**: 完全交给 Pydantic 模型，FastAPI 自动返回 422

错误码映射：
| 异常类型 | HTTP 状态码 | 场景 |
|----------|-------------|------|
| Pydantic ValidationError | 422 | 参数校验失败 |
| ValueError | 400 | 不支持的图片格式等业务校验 |
| FileNotFoundError | 404 | 图片不存在 |
| google.genai 异常 | 502 | Gemini API 调用失败 |
| asyncio.TimeoutError | 504 | 生成超时 |

## Logging

- 使用 Python 标准 `logging` 模块
- 日志格式：`[%(asctime)s] %(levelname)s [%(name)s] %(message)s`
- Service 层记录关键操作：拆分请求、生成开始/完成/失败、耗时
- 不记录敏感信息（API Key、图片二进制数据）
- 开发环境 DEBUG 级别，生产环境 INFO 级别

```python
import logging
logger = logging.getLogger(__name__)

# Service 中的日志示例
logger.info("Generating slide %d/%d", slide.id, total)
logger.error("Slide %d generation failed: %s", slide.id, str(e))
```

## Code Style

- 类型注解：所有函数签名必须有完整的类型注解
- 异步优先：所有 I/O 操作使用 async/await
- Pydantic 模型：所有 API 请求/响应体用 Pydantic BaseModel 定义，不用 dict
- 命名：文件名 snake_case，类名 PascalCase，常量 UPPER_SNAKE_CASE
- 每个模块顶部写一行 docstring 说明职责

## Running

```bash
# 开发模式
uvicorn main:app --reload --port 8000

# 环境变量
cp .env.example .env
# 编辑 .env 填入 GOOGLE_API_KEY
```
