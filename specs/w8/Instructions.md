# 让 java 再次伟大

## agent sdk 翻译成 java 版本

### 评估改造

阅读 @specs/w6/X001-simple-agent-design.md 文档，阅读 @week06/x-simple-agent 项目的代码实现, 然后请你进行全面的评估，是否可以将整套技术栈改造成java，请你给出详尽的分析评估报告，内容包括但不限于：

- 技术栈
- 功能
- 性能
- 其他

最终的分析评估报告文件放在 @specs/w8/ 路径下，文件名你自己想就行

### 技术栈讨论

评估一下可以使用 spring-ai 吗？ 能不能帮助简化开发？ 综合分析后，如果可以的话，更新 @specs/w8/X002-java-migration-analysis.md 文档

把构建工具 Gradle 换成 maven，更新 @specs/w8/X002-java-migration-analysis.md 文档

### 设计文档

提炼 @specs/w6/X001-simple-agent-design.md 文档中的原始任务需求，然后使用 @specs/w8/X002-java-migration-analysis.md 中推荐的技术栈，进行设计文档的编写，文件放在 @specs/w8/ 路径下，文件名你自己想就行

### 实施计划

根据 @specs/w8/X003-design-document.md 文档，编写实施计划，放在 @specs/w8/X004-implementation-plan.md 文档中


### 实施

根据 @specs/w8/X003-design-document.md 设计文档 和 @specs/w8/X004-implementation-plan.md 实施计划文档，开始实现 Phase 1， 代码放在 @week08/simple-agent-by-java 下


### 其他  

spring-ai 已经明确发布了 1.1.x 版本了， 你再尝试一下使用1.1.x 版本

最新的 spring-ai 正式版本已经发行到 1.1.3了，使用这个最新的版本

可以将 spring-boot 升级到 3.5.12 吗？ 请确保升级后可以运行

支持使用 deepseek 模型


## code review 项目 翻译成 java 版本

### 生成一个 system prompt 用于 codereview

based on @specs/w8/prompts/codex-prompt.md and @specs/w8/prompts/opencode-review.txt think hard, we want to generate a system prompt for @week08/codereview-agent-by-java which is based on @week08/simple-agent-by-java/. The codereview agent will only have read file / write file / git command tool so make sure system prompt don't mention unexisting stuff. And make sure system prompt focused on code review but have all the good parts of @specs/w8/prompts/codex-prompt.md. Write the prompts down to @week08/codereview-agent-by-java/prompts/system.md. Think ultra hard.

## 构建 codereview agent design spec

根据 @week08/codereview-agent-by-java/prompts/system.md 文档，以及 @week08/simple-agent-by-java 代码，构建一个 codereview agent。它包含这些工具：

- read file：读取当前目录下某个文件的内容
- write file：写入当前目录下某个文件的内容
- git command：执行 git 命令，尤其是可以根据用户的各种需求，找到合适的 git diff，包括不限于：branch diff, unstaged diff, staged diff, commit diff, pull request diff, 等等
- gh command：执行 gh 命令，尤其是可以根据用户的各种需求，找到合适的 gh 命令，包括不限于：pr view, pr diff, 等等

用户可以这样使用 codereview agent：

- 帮我 review 当前 branch 新代码
- 帮我 review commit 13bad5 之后的代码
- 帮我 review pull request 12 的代码

仔细考虑这些需求，构建一个 solid 的设计文档，文档放在 @specs/w8/X005-codereview-agent-design.md 文件中。design doc 输出中文。

## 构建 codereview agent 代码

根据 @specs/w8/X005-codereview-agent-design.md 文档，构建一个 codereview agent 的代码（使用 @week08/simple-agent-by-java 作为 dependency），代码放在 @week08/codereview-agent-by-java 目录下。代码要完整实现 design spec，符合其要求。实现完成后请根据几个场景运行测试，确保它正常工作。



