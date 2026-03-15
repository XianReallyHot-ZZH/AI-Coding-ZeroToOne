# Week 6 Instructions

## codex 探索

1、查看 codex 的实现，找出其所有 system prompt 和工具调用相关的 prompt ，撰写文档介绍它，放在 ./specs/w6/learnings 目录下。必要时画 ascii 图表帮助理解。codex 的源码在 ./venders/codex 目录下。


## 探索 open code 

1、git submodule add https://github.com/anomalyco/opencode venders/opencode

2、查看 opencode 的实现，找出其所有 system prompt 和工具调用相关的 prompt ，撰写文档介绍它，放在 ./specs/w6/learnings 目录下。必要时画 ascii opencode 的源码在 ./venders/opencode 目录下。

3、查看 ./venders/opencode 源码，帮我了解如何最方便地获得 opencode 每次向 llm 发送的包含完整内容的输入输出，最好是有 hook / plugin 什么的，避免我直接修改源码。先不用撰写，直接告诉我方案。

## claude code 逆向工程

https://yuyz0112.github.io/claude-code-reverse/visualize.html


## 搭一个 simple agent SDK

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


## 基于 agent sdk 实现一个 codereview agent

### 生成一个 system prompt 用于 codereview

based on ./specs/w6/prompts/codex-prompt.md and ./specs/w6/prompts/opencode-review.txt think hard, we want to generate a system prompt for ./week06/codereview-agent which is based on ./week06/simple-agent/. The codereview agent will only have read file / write file / git command tool so make sure system prompt don't mention unexisting stuff. And make sure system prompt focused on code review but have all the good parts of ./specs/w6/prompts/codex-prompt.md. Write the prompts down to ./week06/codereview-agent/prompts/system.md. Think ultra hard.

based on ./specs/w6/prompts/codex-prompt.md and ./specs/w6/prompts/opencode-review.txt think hard, we want to generate a system prompt for ./week06/x-codereview-agent which is based on ./week06/x-simple-agent/. The codereview agent will only have read file / write file / git command tool so make sure system prompt don't mention unexisting stuff. And make sure system prompt focused on code review but have all the good parts of ./specs/w6/prompts/codex-prompt.md. Write the prompts down to ./week06/x-codereview-agent/prompts/system.md. Think ultra hard. Do not refer to ./week06/simple-agent/

## 构建 codereview agent design spec

根据 ./week06/codereview-agent/prompts/system.md 文档，以及 ./week06/simple-agent 代码，构建一个 codereview agent。它包含这些工具：

- read file：读取当前目录下某个文件的内容
- write file：写入当前目录下某个文件的内容
- git command：执行 git 命令，尤其是可以根据用户的各种需求，找到合适的 git diff，包括不限于：branch diff, unstaged diff, staged diff, commit diff, pull request diff, 等等
- gh command：执行 gh 命令，尤其是可以根据用户的各种需求，找到合适的 gh 命令，包括不限于：pr view, pr diff, 等等

这些工具的使用方法，相关的例子要更新在 system.md 中，这样 LLM 可以很方便地使用这些工具。

用户可以这样使用 codereview agent：

- 帮我 review 当前 branch 新代码
- 帮我 review commit 13bad5 之后的代码
- 帮我 review pull request 12 的代码

仔细考虑这些需求，构建一个 solid 的设计文档，文档放在 ./specs/w6/codereview-agent-design.md 文件中。design doc 输出中文。不要参考 ./week06/x-codereview-agent/ 下的东西

## 构建 codereview agent design spec 2

根据 ./week06/x-codereview-agent/prompts/system.md 文档，以及 ./week06/x-simple-agent 代码，构建一个 codereview agent。它包含这些工具：

- read file：读取当前目录下某个文件的内容
- write file：写入当前目录下某个文件的内容
- git command：执行 git 命令，尤其是可以根据用户的各种需求，找到合适的 git diff，包括不限于：branch diff, unstaged diff, staged diff, commit diff, pull request diff, 等等
- gh command：执行 gh 命令，尤其是可以根据用户的各种需求，找到合适的 gh 命令，包括不限于：pr view, pr diff, 等等

这些工具的使用方法，相关的例子要更新在 system.md 中，这样 LLM 可以很方便地使用这些工具。

用户可以这样使用 codereview agent：

- 帮我 review 当前 branch 新代码
- 帮我 review commit 13bad5 之后的代码
- 帮我 review pull request 12 的代码

仔细考虑这些需求，构建一个 solid 的设计文档，文档放在 ./specs/w6/x-codereview-agent-design.md 文件中。design doc 输出中文。不要参考 ./week06/codereview-agent/ 和 ./week06/simple-agent/ 下的东西