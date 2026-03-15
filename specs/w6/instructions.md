# Week 6 Instructions

## codex 探索

1、查看 codex 的实现，找出其所有 system prompt 和工具调用相关的 prompt ，撰写文档介绍它，放在 ./specs/w6/learnings 目录下。必要时画 ascii 图表帮助理解。codex 的源码在 ./venders/codex 目录下。


## 探索 open code 

1、git submodule add https://github.com/anomalyco/opencode venders/opencode

2、查看 opencode 的实现，找出其所有 system prompt 和工具调用相关的 prompt ，撰写文档介绍它，放在 ./specs/w6/learnings 目录下。必要时画 ascii opencode 的源码在 ./venders/opencode 目录下。

3、查看 ./venders/opencode 源码，帮我了解如何最方便地获得 opencode 每次向 llm 发送的包含完整内容的输入输出，最好是有 hook / plugin 什么的，避免我直接修改源码。先不用撰写，直接告诉我方案。

## claude code 逆向工程

https://yuyz0112.github.io/claude-code-reverse/visualize.html


## 搭一个 simple agent

### 探索生成 simple agent 的 design

请你参考 ./venders/opencode 源码，分析 opencode 的主要功能和核心设计，然后帮我设计一个 simple agent（Simple Multi-turn Agent with Tool Calling），它能够：

1. 接收用户消息
2. 调用 LLM 生成响应
3. 识别并执行工具调用
4. 将工具结果返回给 LLM
5. 循环直到任务完成

最终请你给我一份 simple agent 的 design 文档，放在 ./specs/w6/ 目录下。

### 实现

基于 ./specs/w6/simple-agent-design.md 的规范，使用 openai 构建一个 agent sdk，提供 agent 的核心功能，用户可以很方便地为 agent 添加自定义工具和 mcp。完成构建后，确保所有实现否符合 design spec，并提供几个 example 来展示如何使用（包含至少一个使用 mcp 的例子）。代码放在 ./week06/simple-agent 目录下。

基于 ./specs/w6/X001-simple-agent-design.md 的规范，使用 openai 构建一个 agent sdk，提供 agent 的核心功能，用户可以很方便地为 agent 添加自定义工具和 mcp。完成构建后，确保所有实现否符合 design spec，并提供几个 example 来展示如何使用（包含至少一个使用 mcp 的例子）。代码放在 ./week06/x-simple-agent 目录下。

### 改成使用 deepseek

兼容 deepseek 使用


