---
description: MotherDock Neo-Brutalist 设计规范 - 暖色背景、硬边阴影、复古技术风格
globs:
  - "**/*.css"
  - "**/*.scss"
  - "**/*.less"
  - "**/*.vue"
  - "**/*.tsx"
  - "**/*.jsx"
alwaysApply: false
---

# MotherDock 风格前端设计规则

## 设计定位

**Retro-Modern / Neo-Brutalist Tech** - 兼具技术感和视觉趣味性，适合科技/工具产品官网

## 核心设计原则

- 高对比色 + 暖色背景
- 等宽/技术字体
- 厚重边框与硬阴影
- 整洁但不柔和的组件风格
- 功能优先 + 技术识别

---

## 色彩体系

### 主色系

```css
:root {
  --color-bg: #F4EFEA;
  --color-text: #383838;
  --color-border: #383838;
  --color-primary: #FFDE00;
  --color-link: #6FC2FF;
  --color-link-dark: #2BA5FF;
}
```

### 辅助色

```css
:root {
  --color-accent-green: #16AA98;
  --color-accent-purple: #B291DE;
  --color-accent-orange: #FF9538;
  --color-disabled: #A1A1A1;
}
```

### 使用规则

- 暖米色背景用于整体页面
- 深灰用于文本、边框、阴影
- 品牌黄用于关键按钮/CTA
- 蓝色用于链接、按钮 hover
- 辅助色仅用于小装饰、特色标签

---

## 排版规范

### 字体家族

```css
:root {
  --font-mono: 'Aeonik Mono', 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
```

### 文本层级

| 用途      | 字体    | 权重         | 样式       |
| --------- | ------- | ------------ | ---------- |
| 主标题    | Mono    | Bold/Heavy   | 大号       |
| 次级标题  | Mono    | Semi-bold    | 中号       |
| 正文      | Sans    | Regular/400  | 标准阅读   |
| 链接/按钮 | Mono    | Bold         | 全大写     |

### 使用规则

- 标题使用 Mono 字体，正文使用 Sans 字体
- 标题通常大写增加视觉识别率
- 行高、字距略紧，保持观感统一

---

## 边框与间距

### 边框规则

```css
:root {
  --border-width: 2px;
  --border-color: #383838;
  --border-radius: 2px;
}
```

### 间距体系

```css
:root {
  --spacing-xs: 8px;
  --spacing-s: 16px;
  --spacing-m: 24px;
  --spacing-l: 40px;
  --spacing-xl: 64px;
}
```

### 使用规则

- 所有边框采用 2px 实线边框
- 圆角统一为 2px，偏直角风格
- 页面布局整体宽松，内容间距较大
- 内部组件采用一致的 margin 体系
- 水平 & 垂直间距对称确保视觉稳定

---

## 组件规范

### 按钮

```css
.btn-primary {
  background: var(--color-primary);
  border: var(--border-width) solid var(--color-border);
  color: var(--color-text);
  padding: 12px 24px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  font-weight: bold;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-text);
  color: var(--color-primary);
}
```

### 卡片

```css
.card {
  background: #FFFFFF;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: -5px 5px 0px var(--color-border);
  padding: var(--spacing-m);
}
```

### 输入框

```css
input {
  border: var(--border-width) solid var(--color-border);
  background: rgba(248, 248, 247, 0.7);
  font-family: var(--font-sans);
  padding: var(--spacing-s);
  border-radius: var(--border-radius);
}

input:focus {
  border-color: var(--color-link-dark);
  outline: none;
}
```

### 链接

```css
a {
  color: var(--color-link);
  font-family: var(--font-mono);
  font-weight: bold;
}

a:hover {
  color: var(--color-link-dark);
}
```

---

## 阴影与动效

### 阴影

- 使用硬边阴影（非模糊阴影）
- 偏移产生"堆叠纸张"效果

```css
.hard-shadow {
  box-shadow: -5px 5px 0px var(--color-border);
}
```

### 动效

- Hover/Focus 过渡快速（200ms ease）
- 滚动类动画带浮动感
- 避免过度动画，保持简洁

```css
transition: all 0.2s ease;
```

---

## 布局规则

### 容器

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-m);
}
```

### 段落/模块间距

- 段落/模块之间留白明显
- 增强阅读节奏感

---

## 细节设计语言

- 视觉对比强烈：深色文字/边框在暖色背景上
- 大段留白确保内容区块清晰分隔
- 技术感字体增强专业感
- 色彩点缀活泼但不夸张，保持可读优先
- 组件边角硬直强化复古 UI 印象

---

## Tailwind CSS 配置示例

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: '#F4EFEA',
        text: '#383838',
        border: '#383838',
        primary: '#FFDE00',
        link: '#6FC2FF',
        'link-dark': '#2BA5FF',
      },
      fontFamily: {
        mono: ['Aeonik Mono', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '2': '2px',
      },
      borderRadius: {
        'sm': '2px',
      },
      boxShadow: {
        'hard': '-5px 5px 0px #383838',
      },
      spacing: {
        'xs': '8px',
        's': '16px',
        'm': '24px',
        'l': '40px',
        'xl': '64px',
      },
    },
  },
}
```

---

## 快速参考

### 常用类组合

```css
/* 主按钮 */
.btn-primary {
  @apply bg-primary border-2 border-border text-text font-mono font-bold uppercase px-6 py-3 rounded-sm hover:bg-text hover:text-primary transition-all duration-200;
}

/* 卡片 */
.card {
  @apply bg-white border-2 border-border rounded-sm shadow-hard p-6;
}

/* 输入框 */
.input {
  @apply border-2 border-border bg-white/70 font-sans p-4 rounded-sm focus:border-link-dark focus:outline-none;
}

/* 链接 */
.link {
  @apply text-link font-mono font-bold hover:text-link-dark;
}
```

---

## 注意事项

1. 避免使用模糊阴影
2. 边框始终保持 2px 厚度
3. 圆角不超过 2px
4. 标题使用大写
5. 保持高对比度
6. 间距一致性优先
7. 动效快速简洁
