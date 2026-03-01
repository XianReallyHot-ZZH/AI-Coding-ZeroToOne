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

## db-query 添加 mysql db 支持

/speckit.tasks 参考 ./week02/db_query/backend 中的 PostgreSQL 实现，实现 MySQL 的 metadata 提取和查询支持，同时自然语言生成 sql 也支持 MySQL。目前我本地有一个 yyconfig 数据库，使用 `mysql -u root yyconfig -e "SELECT * FROM yyconfig;"` 可以查询到数据。将生成的md文件写到 ./specs/002-mysql-support/ 路径下。


/speckit.implement 根据 ./specs/002-mysql-support/ 路径下的 tasks.md 文件实现 mysql support。

## review db-query 新增功能后的代码

帮我仔细查看 ./week02/db_query/backend 的架构，最好设计一套 interface，为以后添加更多数据库留有余地，不至于到处修改已有代码。设计要符合 Open-Close 和 SOLID 原则，要有好的扩展性。新的设计形成文档放在 ./specs/w3/db-query-architecture-improvement 路径下。 

## 架构演进重构

根据 ./specs/w3/db-query-architecture-improvement 路径下的文档，对 ./week02/db_query/backend 进行架构演进重构。

