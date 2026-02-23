---
description: MotherDuck 暗色主题设计规范 - 高对比度配色、技术感排版、终端风格组件
globs:
  - "**/*.css"
  - "**/*.scss"
  - "**/*.less"
  - "**/*.vue"
  - "**/*.tsx"
  - "**/*.jsx"
alwaysApply: false
---

# MotherDuck 风格前端设计规则

## 设计理念

MotherDuck 风格的核心是**"硬核技术感"与"活泼趣味性"的完美平衡**。作为开发者工具类产品，设计语言既要体现极客、专业、高效（类似终端和代码编辑器），又要通过标志性的"鸭子"元素和明亮的色彩打破枯燥。

---

## 1. 色彩系统 (Color System)

采用**高对比度**策略，极度依赖暗色背景来衬托品牌标志性的"鸭子黄"。

### 核心色值

```css
:root {
  /* 背景色 */
  --md-bg-dark: #0f1014;
  --md-bg-card: #18191e;
  --md-bg-elevated: #242424;
  
  /* 品牌主色 - 鸭子黄 */
  --md-brand-yellow: #FFD600;
  --md-brand-yellow-hover: #E5C000;
  
  /* 文本色 */
  --md-text-primary: #FFFFFF;
  --md-text-secondary: #A1A1AA;
  --md-text-inverse: #000000;
  
  /* 代码高亮色 */
  --md-syntax-green: #4ADE80;
  --md-syntax-pink: #F472B6;
  --md-syntax-blue: #38BDF8;
  
  /* 边框 */
  --md-border-light: rgba(255, 255, 255, 0.12);
  --md-border-focus: #FFD600;
}
```

### 色彩使用原则

- **背景必须够黑**：使用 `#0f1014` 或更深的背景色，凸显主色
- **黄色必须纯粹**：不带过多橙色调，使用标准纯黄色 `#FFD600`
- **高对比度**：黄色按钮上使用纯黑文字，深色背景上使用纯白文字

---

## 2. 字体排版 (Typography)

### 字体选择

```css
:root {
  --md-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --md-font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}
```

### 排版规范

- **标题**：极粗字重（700-800），紧凑行高（1.1-1.2），负字间距
- **正文**：常规字重（400），行高 1.6
- **代码/数据标记**：强制使用等宽字体，增加专业感

```css
h1, h2, h3 {
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--md-text-primary);
}

body {
  font-family: var(--md-font-sans);
  line-height: 1.6;
}
```

---

## 3. 边框与圆角 (Border & Radius)

介于现代极简和新粗野主义（Neo-brutalism）之间。

### 圆角规范

```css
:root {
  --md-radius-sm: 6px;
  --md-radius-md: 12px;
  --md-radius-lg: 24px;
  --md-radius-pill: 9999px;
}
```

### 边框规范

- 卡片使用细微浅色边框区分层级
- 悬浮时边框高亮成鸭子黄

```css
.card {
  border: 1px solid var(--md-border-light);
  border-radius: var(--md-radius-md);
}

.card:hover {
  border-color: var(--md-brand-yellow);
}
```

### 阴影规范

偏向扁平化的发光效果或极弱的扩散阴影：

```css
:root {
  --md-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --md-shadow-glow: 0 0 15px rgba(255, 214, 0, 0.2);
}
```

---

## 4. 空间与布局 (Spacing & Layout)

现代 SaaS 产品的核心特征是"呼吸感"。

### 间距规范

```css
:root {
  --md-space-xs: 4px;
  --md-space-sm: 8px;
  --md-space-md: 16px;
  --md-space-lg: 24px;
  --md-space-xl: 32px;
  --md-space-2xl: 48px;
  --md-space-3xl: 64px;
  --md-space-section: 120px;
}
```

### 布局原则

- **Section Padding**：区块间距大，通常 `padding: 120px 24px`
- **按钮 Padding**：饱满感，`padding: 14px 28px`
- **卡片 Padding**：充裕留白，`padding: 32px` 或 `48px`

---

## 5. 核心组件 (Components)

### 主按钮 (Primary Button)

绝对的视觉焦点，背景为品牌黄，文字为纯黑。

```css
.btn-primary {
  background-color: var(--md-brand-yellow);
  color: var(--md-text-inverse);
  font-family: var(--md-font-sans);
  font-weight: 700;
  font-size: 16px;
  padding: 14px 28px;
  border-radius: var(--md-radius-md);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary:hover {
  background-color: var(--md-brand-yellow-hover);
  transform: translateY(-2px);
  box-shadow: var(--md-shadow-glow);
}
```

### 特色卡片 (Feature Card)

```css
.feature-card {
  background-color: var(--md-bg-card);
  border: 1px solid var(--md-border-light);
  border-radius: var(--md-radius-md);
  padding: 32px;
  transition: border-color 0.2s ease;
}

.feature-card:hover {
  border-color: var(--md-brand-yellow);
}
```

### 终端代码块 (Terminal Code Block)

深色圆角矩形，左上角带 MacOS 风格的三色小圆点。

```css
.code-block {
  background-color: #000000;
  border: 1px solid var(--md-border-light);
  border-radius: var(--md-radius-md);
  padding: 24px;
  font-family: var(--md-font-mono);
  font-size: 14px;
  color: #E2E8F0;
  position: relative;
}

.code-block::before {
  content: '';
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #FF5F56;
  box-shadow: 18px 0 0 #FFBD2E, 36px 0 0 #27C93F;
  margin-bottom: 20px;
}
```

### 标签/徽章 (Tags/Badges)

小巧的胶囊状标签：

```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--md-radius-pill);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--md-font-mono);
}

.tag-outline {
  border: 1px solid var(--md-border-light);
  color: var(--md-text-secondary);
}

.tag-filled {
  background-color: var(--md-brand-yellow);
  color: var(--md-text-inverse);
}
```

---

## 6. 视觉元素与插图

### 吉祥物元素

- 在严肃的数据分析、架构图旁边，加入幽默、低保真（如像素化）或极简风格的"鸭子"吉祥物插画
- 这种反差萌是 MotherDuck 设计的灵魂

### 插图风格

- 像素风 / 扁平化风格
- 在硬核的技术词汇旁边放置漫不经心的小鸭子插画

---

## 7. 动效规范

### 过渡动画

```css
:root {
  --md-transition-fast: 0.15s ease-in-out;
  --md-transition-normal: 0.2s ease-in-out;
  --md-transition-slow: 0.3s ease-in-out;
}
```

### 交互反馈

- 按钮 hover：轻微上移 + 黄色发光
- 卡片 hover：边框高亮成鸭子黄
- 避免过度动画，保持专业感

---

## 8. 响应式断点

```css
:root {
  --md-breakpoint-sm: 640px;
  --md-breakpoint-md: 768px;
  --md-breakpoint-lg: 1024px;
  --md-breakpoint-xl: 1280px;
  --md-breakpoint-2xl: 1536px;
}
```

---

## 总结：复刻秘诀

1. **背景一定要够黑**，这样才能凸显主色
2. **黄色一定要纯粹**，不带过多橙色调，是标准的纯黄色
3. **字体粗细对比要强**，大标题极粗，正文纤细，SQL 语句强制使用好看的等宽字体
4. **注入幽默感**，在硬核的技术词汇旁边放上一只漫不经心的小鸭子插画
