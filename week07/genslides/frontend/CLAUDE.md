# GenSlides Frontend — Development Guidelines

## Tech Stack

- React 18 + TypeScript 5
- Vite 6 (build + dev server)
- Tailwind CSS 4 (styling)
- Embla Carousel 8 (slideshow)

## Architecture

```
src/
├── components/          # UI 组件，纯展示 + 事件回调
│   ├── InputPanel.tsx   # 左侧：文本输入、页数选择、风格配置、操作按钮
│   ├── PreviewPanel.tsx # 右侧：进度条、缩略图网格、播放按钮
│   ├── SlideCard.tsx    # 单页 Slide 卡片（缩略图 + 状态 + 操作）
│   ├── Carousel.tsx     # 全屏走马灯播放（Embla + Fullscreen API）
│   └── ProgressBar.tsx  # 生成进度条
├── hooks/
│   └── useSlides.ts     # 核心状态管理：slides 数据、加载/生成状态、所有操作方法
├── api/
│   └── client.ts        # 后端 API 封装：REST 请求 + SSE 流处理
├── types/
│   └── index.ts         # TypeScript 接口定义，与后端 Pydantic 模型一一对应
├── App.tsx              # 根组件：左右面板布局，组合 InputPanel + PreviewPanel
└── main.tsx             # 入口：ReactDOM.createRoot
```

## Design Principles

### SOLID
- **S**: 每个组件只负责一个 UI 区域；useSlides 只管 slides 状态；client.ts 只管 HTTP
- **O**: 新增分辨率选项或风格预设时，扩展 types 和 UI 选项，不改组件逻辑
- **I**: 组件通过 props 接收最小必要数据，不传整个 state 对象
- **D**: 组件不直接调用 api.client，通过 useSlides hook 提供的方法间接调用

### YAGNI
- 不引入 Redux/Zustand，useState + 自定义 hook 足够
- 不做路由（react-router），单页面不需要
- 不做 SSR，纯客户端渲染
- 不做主题切换，固定一套 UI

### KISS
- 状态集中在 useSlides hook，组件只做渲染和事件转发
- SSE 处理用 fetch + ReadableStream，不引入第三方 SSE 库
- 样式用 Tailwind 原子类，不写自定义 CSS 文件（除非动画需要）
- 拖拽排序用 HTML5 Drag and Drop API，不引入 dnd-kit

## Component Patterns

- 函数组件 + hooks，不用 class 组件
- Props 接口在组件文件顶部定义，命名 `XxxProps`
- 事件回调命名 `onXxx`（props）/ `handleXxx`（内部）
- 条件渲染用 `&&` 或三元，不用 `if` 语句
- 列表渲染必须有稳定的 `key`（用 slide.id）

```tsx
interface SlideCardProps {
  slide: SlideItem;
  onRegenerate: (id: number) => void;
}

function SlideCard({ slide, onRegenerate }: SlideCardProps) {
  const handleClick = () => onRegenerate(slide.id);
  // ...
}
```

## Concurrency / Async

- SSE 流通过 `fetch` + `ReadableStream` 消费（不用 EventSource，因为需要 POST body）
- 解析 SSE 时维护 buffer 处理跨 chunk 的不完整行
- `useSlides.generateAll` 是非阻塞的：发起请求后通过回调更新状态
- 图片加载用 `<img>` 标签的原生懒加载（`loading="lazy"`）
- 避免在 SSE 回调中做重计算，只做 setState

```typescript
// SSE 消费模式
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // 按 \n 分割，处理完整行，保留不完整行在 buffer
}
```

## Error Handling

- API 请求失败：`client.ts` 统一解析错误响应，抛出 `Error(detail)`
- 组件层：用 try/catch 捕获，通过 state 展示错误信息（inline 提示，不用 toast 库）
- SSE 流中断：检测 `reader.read()` 的 `done` 状态，触发 `onComplete`
- 单页生成失败：SlideCard 显示 error 状态 + 重试按钮，不影响其他卡片
- 网络错误：显示友好提示，不暴露技术细节

```typescript
// API 错误处理模式
try {
  await api.splitContent(request);
} catch (err) {
  setError(err instanceof Error ? err.message : '请求失败');
}
```

## Logging

- 开发环境使用 `console.warn` / `console.error` 记录异常
- 不在生产构建中保留 `console.log`（Vite 构建时 drop）
- SSE 解析错误记录 `console.warn`，不中断流处理

## Code Style

- 严格 TypeScript：`strict: true`，不用 `any`（api 响应除外的过渡期可用）
- 文件命名：组件 PascalCase（`SlideCard.tsx`），其他 camelCase（`useSlides.ts`）
- 导入顺序：React → 第三方库 → 本地模块 → 类型
- 所有与后端交互的数据结构在 `types/index.ts` 集中定义
- 组件 props 解构在参数位置，不在函数体内

## Dev Server

```bash
# 开发模式（自动代理 /api → localhost:8000）
npm run dev

# 构建生产版本
npm run build
```

Vite dev server 配置了 `/api` 代理到后端 `http://localhost:8000`，开发时前后端分别启动。
