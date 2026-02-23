我已经打开并分析了 **[https://motherduck.com/](https://motherduck.com/)** 页面结构，并结合社区复刻风格总结（MotherDuck 的 UI/设计特点）。基于此我总结了一份可用于复刻其网站设计风格的 **设计规范/风格指南**，包括颜色、排版、间距、边框、组件等核心要素。([MotherDuck][1])

---

# **MotherDuck 网站设计风格指南（可用于复刻）**

## 🎨 色彩体系（Color Palette）

MotherDuck 的配色具有鲜明对比、高可读性和品牌识别性：

**主色系**

* **暖米色背景** — 用于整体页面背景
  例：类似 `#F4EFEA`
* **深灰/黑色** — 文本主要颜色、边框、阴影
  例：类似 `#383838`
* **品牌黄** — 关键按钮/CTA、高亮元素
  例：类似 `#FFDE00`

**辅助色（Accent）**

* **天蓝 / 深蓝** — 链接、按钮 hover、按钮强调色
  例：`#6FC2FF` / `#2BA5FF`
* **其它点缀色** — 绿色、紫色、橙色等用于小装饰、特色标签
  例：`#16AA98`, `#B291DE`, `#FF9538`

**功能性色**

* Disabled/placeholder: `#A1A1A1`
* 边框色统一为深灰（增强对比）

> 色彩总体趋向“高对比、暖色背景 + 冷色点缀”，视觉冲击强且易读。([LINUX DO][2])

---

## 🔤 排版（Typography）

MotherDuck 的排版组合强调结构清晰，同时营造技术感：

### 字体家族（Font Families）

* **标题和 UI 文本**：技术感强的等宽字体，如 **Aeonik Mono** 或等宽衍生体
* **正文字体**：清晰的无衬线字体，如 **Inter** 系列

### 文本风格

| 用途    | 字体      | 权重          | 样式       |
| ----- | ------- | ----------- | -------- |
| 主标题   | Mono 字体 | Bold/Heavy  | 大号       |
| 次级标题  | Mono 字体 | Semi-bold   | 中号       |
| 正文    | Inter   | Regular/400 | 标准阅读     |
| 链接/按钮 | Mono    | Bold        | 全大写或大写视觉 |

### 文本规范

* 标题通常大写增加视觉识别率
* 行高、字距都略紧，便于观感统一

> 标题与正文使用不同字体以强化层次感。([LINUX DO][2])

---

## 🧱 边框、间距、布局（Borders / Spacing）

### 边框（Border）

* 所有边框采用 **实线边框**
* **厚重边框**（比如 2px 深灰）体现“复古界面”（Retro UI）风格
* 圆角通常较小（2px），偏直角风格

### 间距（Padding / Margin）

* 页面布局整体宽松，内容间距较大
* 内部组件（Card / Section）均采用一致的 margin 体系
* 水平 & 垂直间距对称以确保视觉稳定

```css
/* 示例 spacing 体系 */
:root {
  --spacing-xs: 8px;
  --spacing-s: 16px;
  --spacing-m: 24px;
  --spacing-l: 40px;
}
```

### 布局

* 主要采用居中内容宽度容器
* 段落/模块之间留白明显，增强阅读节奏感

> 间距规范关键在 **一致性与节奏**，避免拥挤视觉。([LINUX DO][2])

---

## 🧩 组件核心（Components）

### 按钮（Button）

* 主要按钮：品牌黄背景 + 深灰边框 + 深灰文字
* Hover：深灰背景 / 灰色边框反馈
* 文本全大写或字母间距略增加

```css
.btn-primary {
  background: #FFDE00;
  border: 2px solid #383838;
  color: #383838;
  padding: 12px 24px;
  font-family: 'Aeonik Mono', monospace;
  text-transform: uppercase;
}
```

### 卡片（Card / Feature）

* 白色卡片背景
* 深灰厚边框
* 有硬阴影模拟层叠效果

```css
.card {
  background: #FFFFFF;
  border: 2px solid #383838;
  box-shadow: -5px 5px 0px #383838;
  padding: var(--spacing-m);
}
```

### 链接 & 导航

* 导航链接字体使用 Mono
* Hover 有色块背景或颜色变化

### 表单（Input）

* 边框明显，focus 边框变色
* 背景半透明浅色

```css
input {
  border: 2px solid #383838;
  background: rgba(248, 248, 247, 0.7);
  font-family: 'Inter', sans-serif;
  padding: var(--spacing-s);
}
input:focus {
  border-color: #2BA5FF;
}
```

> 组件视觉具有统一的“复古/技术感”特征，全线使用 Mono + 强边框。([LINUX DO][2])

---

## 💡 阴影 & 动效（Shadows / Animations）

### 阴影（Shadow）

* 非模糊硬阴影（硬边投影）
* 通过偏移产生“堆叠纸张”效果，而非常见的柔和阴影

```css
box-shadow: -5px 5px 0px #383838;
```

### 动效（Transitions）

* Hover/Focus 过渡简单、快速（约 200ms ease）
* 滚动类动画带浮动感

---

## 🧠 细节感知（细节设计语言）

* **视觉对比强烈**：深色文字/边框在暖色背景上
* **大段留白**确保内容区块清晰分隔
* **技术感字体增强专业感**
* **色彩点缀活泼但不夸张**，保持可读优先
* **组件边角硬直**强化复古 UI 印象

---

## 🪶 总体设计定位

MotherDuck 的 UI 风格可归结为 **Retro-Modern / Neo-Brutalist Tech**：

* **高对比色 + 暖色背景**
* **等宽/技术字体**
* **厚重边框与硬阴影**
* **整洁但不柔和的组件风格**
* **细节以“功能优先 + 技术识别”为主**

这样的设计风格兼具技术感和视觉趣味性，适合科技/工具产品官网。([LINUX DO][2])

---

如果你需要，我还可以提供 **完整 Tailwind CSS 版本样式模板** 或 **Figma 设计模版参考**。要不要？

[1]: https://motherduck.com/ "MotherDuck | The Cloud Data Warehouse Built on DuckDB"
[2]: https://linux.do/t/topic/1357154?utm_source=chatgpt.com "像素级复刻一个站点风格 - 开发调优 - LINUX DO"
