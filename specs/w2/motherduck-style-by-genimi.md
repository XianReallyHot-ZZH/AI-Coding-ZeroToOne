复刻 MotherDuck ([https://motherduck.com/](https://motherduck.com/)) 的网站设计，核心在于把握其**“硬核技术感”与“活泼趣味性”的完美平衡**。作为一家为开发者提供基于 DuckDB 的云数据仓库公司，它的设计语言既要体现极客、专业、高效（类似终端和代码编辑器），又要通过标志性的“鸭子”元素和明亮的色彩打破枯燥。

以下是提取的 MotherDuck 网页设计风格核心要素，以及如何复刻该风格的详细指南和 CSS 代码参考：

### 1. 核心色彩系统 (Color System)

MotherDuck 的色彩策略是**高对比度**，极度依赖暗色背景来衬托其品牌标志性的“鸭子黄”。

* **品牌主色 (Primary Accent)**：**明黄色 (Duck Yellow)**。通常是非常亮眼、饱和度极高的黄色，用于核心按钮 (CTA)、重要强调文本和插画。
* Hex: `#FFD600` 或 `#FACC15`


* **背景色 (Backgrounds)**：倾向于深色模式（Dark Mode），营造出终端代码编辑器的极客感。
* 深色主背景: `#0D0D0D` 或 `#121212` (极深的黑灰色)
* 深色卡片/浮层背景: `#1A1A1A` 或 `#242424`


* **文本颜色 (Typography Colors)**：
* 主标题/正文 (Dark Mode): `#FFFFFF` 或 `#F8F9FA`
* 次要文本 (Secondary): `#A1A1AA` 或 `#9CA3AF` (冷灰色，保证层级感)


* **代码高亮色 (Syntax Highlighting)**：终端绿 `#4ADE80`、霓虹粉 `#F472B6`、天蓝 `#38BDF8`。

### 2. 字体与排版 (Typography)

设计具有强烈的“开发者工具”属性，字体的选择至关重要：

* **无衬线字体 (Sans-serif - 用于UI、标题、正文)**：选择干净、现代、具有几何感的无衬线字体。
* 推荐：`Inter`, `Roobert`, `Space Grotesk` 或 `Plus Jakarta Sans`。
* 特点：标题通常使用极粗的字重（Bold / ExtraBold，700-800），行高紧凑（line-height: 1.1 - 1.2），显得有力量感。


* **等宽字体 (Monospace - 用于代码块、数据标记、标签)**：这是极客风的灵魂。
* 推荐：`JetBrains Mono`, `Fira Code`, `Roboto Mono`。
* 特点：在 UI 中穿插使用等宽字体（例如显示 SQL 语句、大小写敏感的参数等），增加专业感。



### 3. 边框与圆角 (Border & Radius)

MotherDuck 不采用极其圆润的“糖果风”，而是介于现代极简和新粗野主义（Neo-brutalism）之间：

* **Border-Radius**：中等圆角，通常在 `8px` 到 `12px` 之间。这让卡片和按钮显得友好，但又不会失去技术产品的严肃性。
* **Borders**：深色模式下，卡片通常带有细微的浅色边框以区分层级。
* 例如：`border: 1px solid rgba(255, 255, 255, 0.1);` 或 `border: 1px solid #333;`


* **Shadows (阴影)**：偏向于扁平化的发光效果或极弱的扩散阴影，而不是传统的厚重拟物阴影。
* 发光效果：`box-shadow: 0 0 20px rgba(255, 214, 0, 0.1);`（黄色微光）



### 4. 空间与布局 (Margin & Padding)

现代 SaaS 产品的核心特征是“呼吸感”：

* **Section Padding**：区块之间的间距非常大，通常是 `padding: 120px 24px;` 或更大，让用户视线聚焦在当前内容。
* **Component Padding**：
* 主按钮十分饱满：`padding: 12px 24px;` 或 `16px 32px;`
* 卡片内部留白充裕：`padding: 32px;` 甚至 `48px;`



### 5. 核心组件 (Components)

* **Primary Button (主按钮)**：绝对的视觉焦点。背景为品牌黄，文字为纯黑，强对比。Hover 时可能会有轻微的亮度变化或细微的位移。
* **Code Snippet Box (代码高亮块)**：通常是深色的圆角矩形，左上角常常带有 MacOS 风格的三个红黄绿小圆点（模拟终端窗口），内部使用等宽字体和语法高亮。
* **Tags/Badges (标签)**：小巧的胶囊状标签（`border-radius: 9999px`），用高对比度的边框或淡色背景包裹（如 `SQL`、`New`、`Beta`）。

### 6. 视觉元素：IP与插图

* **像素风 / 扁平化小黄鸭**：在严肃的数据分析、架构图旁边，突然出现一只戴着墨镜或敲键盘的“鸭子”，这种反差萌是 MotherDuck 设计的灵魂。复刻时，一定要加入幽默、低保真（如像素化）或极简风格的相关吉祥物插画。

---

### 💡 复刻用 CSS Variables (设计系统模板)

如果你想用一段代码在你的项目中快速注入 MotherDuck 的灵魂，可以参考以下 CSS 变量：

```css
:root {
  /* Colors */
  --md-bg-dark: #0f1014;         /* 极深邃的背景色 */
  --md-bg-card: #18191e;         /* 卡片背景，稍微提亮 */
  --md-brand-yellow: #FFD600;    /* 核心鸭子黄 */
  --md-brand-yellow-hover: #E5C000;
  
  --md-text-primary: #FFFFFF;
  --md-text-secondary: #A1A1AA;
  --md-text-inverse: #000000;    /* 用于黄色按钮上的文字 */
  
  /* Borders & Shadows */
  --md-border-light: rgba(255, 255, 255, 0.12);
  --md-border-focus: #FFD600;
  --md-radius-sm: 6px;
  --md-radius-md: 12px;
  --md-radius-lg: 24px;
  --md-radius-pill: 9999px;
  
  --md-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --md-shadow-glow: 0 0 15px rgba(255, 214, 0, 0.2); /* 黄色发光效果 */

  /* Typography */
  --md-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --md-font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

/* --- 核心组件示例代码 --- */

/* 网页全局背景 */
body {
  background-color: var(--md-bg-dark);
  color: var(--md-text-primary);
  font-family: var(--md-font-sans);
  line-height: 1.6;
}

/* 主按钮 (Primary CTA) */
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

/* 特色卡片 (Feature Card) */
.feature-card {
  background-color: var(--md-bg-card);
  border: 1px solid var(--md-border-light);
  border-radius: var(--md-radius-md);
  padding: 32px;
  transition: border-color 0.2s ease;
}

.feature-card:hover {
  border-color: var(--md-brand-yellow); /* 悬浮时边框高亮成鸭子黄 */
}

/* 标题样式 */
h1, h2, h3 {
  font-weight: 800;
  letter-spacing: -0.02em; /* 紧凑的字间距增加力量感 */
  line-height: 1.1;
  color: var(--md-text-primary);
}

/* 模拟终端代码块 (Terminal Code Block) */
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

/* 终端顶部的小圆点装饰 */
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

### 总结复刻秘诀：

1. **背景一定要够黑**，这样才能凸显主色。
2. **黄色一定要纯粹**，不带过多橙色调，是标准的纯黄色。
3. **字体粗细对比要强**，大标题极粗，正文纤细，SQL语句强制使用好看的等宽字体。
4. **注入幽默感**，在硬核的技术词汇旁边放上一只漫不经心的小鸭子插画。