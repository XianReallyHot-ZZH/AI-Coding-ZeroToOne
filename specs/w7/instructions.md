# instructions

## 调研

帮我研究一下市面上关于使用AI进行slides生成的工具，尤其是 manus 和 notebooklm 的 slide 功能，探索他实现的原理。另外，探索如何使用 google 最新推出的 nano banana pro 来做 slides 生成（思考：根据文本生成图片，把所有图片以幻灯片的形式连起来播放，就构成了 slides，类似 notebooklm 里的 slides 生成。要求：图片和视觉风格要统一，用户可以提供一个视觉风格图片或者文字描述）。

## Generate PRD from wireframe

根据 @specs/w7/genslide.jpg 的内容，仔细阅读并思考，生成一个 ./specs/w7/0001-prd.md 的 PRD。要求：使用中文。这个 app 是一个本地运行的单页 app，使用 nano banana pro 生成图片 slides，可以以走马灯的形式全屏播出。后端使用 Python，前端使用 Typescript。

## Generate design spec

根据 @specs/w7/0001-prd.md 和 @specs/w7/genslide.jpg 的内容，生成一个 design spec，放在 ./specs/w7/0002-design-spec.md 文件中。要求：使用中文，注意所有前端所需的 API 接口要定义清楚。整体项目的目录结构也要定义清楚，后端代码层次清晰，API/业务/存储要保持清晰的边界。

## Generate project structure

根据 @specs/w7/0002-design-spec.md 的内容，生成项目的空的目录结构。先不要生成代码。在 backend/ 和 frontend/ 目录下分别生成 CLAUDE.md 文件，内容考虑：

- 所使用语言框架的 best practices
- 架构设计遵循的原则：SOLID/YAGNI/KISS
- 代码的组织结构
- 并发处理
- 错误处理和日志处理

代码放在 @week07/genslides 目录下。

## Implement backend and frontend

根据 @specs/w7/0002-design-spec.md 的内容，启动 python 和 typescript 两个 agent 分别撰写后端和前端的代码。代码在 @week07/genslides 下。


## Test the app

启动 @week07/genslides 目录下的 后端代码

启动 @week07/genslides 目录下的 前端代码

为 @week07/genslides 目录下的前后端代码生成 .gitignore 文件

为 @week07/genslides 项目生成 README.md 文件


