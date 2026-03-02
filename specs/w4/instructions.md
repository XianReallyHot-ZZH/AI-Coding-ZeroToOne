# Instructions

## 探索

利用 notebooklm 探索1：研究业界都是如何阅读大型代码库的，有什么最佳实践？特别是如何梳理它的架构，数据处理流程，子系统，接口设计，子系统接口设计，设计思路，实现思路等

利用 notebooklm 探索2：探索当前业界是如何利用 claude code 对大型开源代码库进行阅读分析的，有什么最佳实践？特别是如何梳理它的架构、核心处理流程、模块设计与关系，代码库的设计思路、演进逻辑等。有没有开源工具能结合 claude code 完成上述的需求。

## OpenAI Codex 大型代码库 阅读 实践

### 添加 子模块 
git submodule add https://github.com/openai/codex venders/codex

###  阅读 codex 代码（静态）

仔细阅读 @venders/codex\ 的代码，撰写一个详细的架构分析文档，如需图表，使用 mermaid chart。文档放在: ./specs/w4/codex-arch.md

### nanobanana 生成架构图

根据 codex-arch.md 生成一张能体现文档核心内容，同时生动有趣的图片。

## 阅读 codex 的 history（演进）

查看 repo 的所有 commit history，梳理其代码变更的脉络，必要时辅以 mermaid chart。 写入 ./specs/w4/codex-changes.md

### 事件循环



### 工具调用



### 了解 codex 的 apply_patch 工具



### apply_patch 集成



### open-notebook 架构设计



### open-notebook 如何使用 Surrealdb



### podcast 生成


