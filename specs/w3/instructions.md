# Instructions

## agent



## code review command

帮我参考 @D:\Developer\Github\my-projects\AI-Coding-ZeroToOne\.claude\commands\speckit.specify.md 的结构，think ultra hard，构建一个对 Python 和 Typescript 代码进行深度代码审查的命令，放在 @.claude/commands/ 下。主要考虑几个方面：

- 架构和设计：是否考虑 python 和 typescript 的架构和设计最佳实践？是否有清晰的接口设计？是否考虑一定程度的可扩展性
- KISS 原则
- 代码质量：DRY, YAGNI, SOLID, etc. 函数原则上不超过 150 行，参数原则上不超过 7 个。
- 使用 builder 模式

## code review execution

/codereview.deep ./week02/db_query
