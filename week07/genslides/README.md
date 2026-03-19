# GenSlides

AI 驱动的幻灯片生成器，基于 Google Gemini API 自动生成配图幻灯片。

## 功能特性

- **智能内容拆分**: 输入主题或大纲，AI 自动拆分为多页幻灯片
- **AI 图片生成**: 基于内容自动生成匹配的配图
- **风格参考**: 支持上传风格参考图片，保持视觉一致性
- **多种分辨率**: 支持 HD (1024x576)、FHD (1920x1080)、UHD (3840x2160)
- **实时预览**: 流式生成进度展示，实时查看生成结果
- **幻灯片轮播**: 内置轮播组件，支持自动播放

## 技术栈

### 后端
- Python 3.12+
- FastAPI
- Google Gemini API (图片生成)
- SSE (Server-Sent Events) 流式响应

### 前端
- React 18
- TypeScript
- Vite
- TailwindCSS
- Embla Carousel

## 项目结构

```
genslides/
├── backend/
│   ├── app/
│   │   ├── api/routes.py      # REST API 路由
│   │   ├── models/schemas.py  # Pydantic 数据模型
│   │   ├── services/          # 业务逻辑
│   │   │   ├── generator.py   # 图片生成服务
│   │   │   ├── splitter.py    # 内容拆分服务
│   │   │   └── style.py       # 风格处理服务
│   │   ├── storage/           # 存储层
│   │   └── deps.py            # 依赖注入
│   ├── output/                # 生成的图片
│   ├── styles/                # 上传的风格图片
│   └── main.py                # FastAPI 入口
├── frontend/
│   ├── src/
│   │   ├── components/        # React 组件
│   │   ├── hooks/useSlides.ts # 状态管理 Hook
│   │   ├── api/client.ts      # API 客户端
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 18+
- Google Gemini API Key

### 后端配置

1. 进入后端目录并配置环境变量:

```bash
cd backend
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 API Key:

```env
GOOGLE_API_KEY=your-api-key-here
MAX_CONCURRENT=3
OUTPUT_DIR=./output
STYLES_DIR=./styles
```

3. 安装依赖并启动:

```bash
pip install google-genai fastapi uvicorn python-dotenv python-multipart
uvicorn main:app --reload --port 8000
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

### 访问应用

- 前端界面: http://localhost:5173
- API 文档: http://localhost:8000/docs

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/slides/split` | 将内容拆分为多页幻灯片 |
| POST | `/api/slides/generate` | 批量生成幻灯片图片 (SSE 流) |
| POST | `/api/slides/{id}/regenerate` | 重新生成单页幻灯片 |
| GET | `/api/slides` | 获取所有幻灯片数据 |
| PUT | `/api/slides/reorder` | 调整幻灯片顺序 |
| POST | `/api/style/upload` | 上传风格参考图片 |
| GET | `/api/slides/{id}/image` | 获取生成的图片 |

## 使用流程

1. 在左侧面板输入主题或大纲内容
2. (可选) 上传风格参考图片
3. (可选) 设置视觉风格描述
4. 点击"拆分内容"生成幻灯片大纲
5. 预览并编辑各页内容
6. 点击"生成图片"开始 AI 配图生成
7. 生成完成后可点击"播放"查看轮播效果
