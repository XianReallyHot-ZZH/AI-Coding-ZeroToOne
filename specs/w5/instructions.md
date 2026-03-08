# instructions

## 构建 mcp server

主要的需求是创建一个Postgres的mcp：用户可以给特定自然语言描述的查询的需求，然后mcp server 根据结果来返回一个SQL或者返回这个查询的结果。mcp的服务器在启动的时候，应该读取它都有哪些可以访问的数据库，并且缓存这些数据库的schema：了解每一个数据库下面都有哪些 table/view/types/index 等等，然后根据这些信息以及用户的输入去调用deepseek的大模型  来生成 SQL。之后mcp server应该来校验这个sql只允许查询的语句,然后测试这个sql确保它能够执行并且返回有意义的结果：这里也可以把用户的输入生成的sql以及返回的结果的一部分调用deepseek来确认这样可以确保它的结果是不是有意义。最后根据用户的输入是返回SQL还是返回SQL查询之后的结果来返回相应的内容。根据这些需求帮我构建一个详细的需求文档，先不要著急去做设计，等我review完这个需求文档之后呢我们再来讨论设计，文档放在 ./specs/w5/001-pg-mcp-prd.md 文件中。

## 向大模型问一下技术选型

主要的需求是创建一个Postgres的mcp：用户可以给特定自然语言描述的查询的需求，然后mcp server 根据结果来返回一个SQL或者返回这个查询的结果。mcp的服务器在启动的时候，应该读取它都有哪些可以访问的数据库，并且缓存这些数据库的schema：了解每一个数据库下面都有哪些 table/view/types/index 等等，然后根据这些信息以及用户的输入去调用deepseek的大模型来生成 SQL。之后mcp server应该来校验这个sql只允许查询的语句,然后测试这个sql确保它能够执行并且返回有意义的结果：这里也可以把用户的输入生成的sql以及返回的结果的一部分调用deepseek来确认这样可以确保它的结果是不是有意义。最后根据用户的输入是返回SQL还是返回SQL查询之后的结果来返回相应的内容。帮我研究一下这个需求如果使用python来实现的话，那应该用哪些库，为什么用这些库。

## 构建 pg-mcp 的设计文档

根据 ./specs/w5/001-pg-mcp-prd.md 文档，使用 FastMCP、Asyncpg、SQLGlot、Pydantic 构建 pg-mcp 的设计文档，文档放在 ./specs/w5/002-pg-mcp-design.md 文件中。该项目下你能访问的路径：
- ./specs/w5/
- ./week05/pg-mcp/
不要参考其他路径下的文件和代码。

## 生成项目 claude.md 文件

为 ./week05/pg-mcp 生成 CLAUDE.md 文件，要求：代码要符合 python best practice / idomatic python , 符合 SOLID/DRY 等设计思路，代码质量和测试质量要高，性能要好。

## impl plan

根据 ./specs/w5/002-pg-mcp-design.md 文档，构建 pg-mcp 的实现计划，think ultra hard，文档放在 ./specs/w5/003-pg-mcp-impl-plan.md 文件中。

## 拆分 plan

根据 ./specs/w5/003-pg-mcp-impl-plan.md 文档，将实现计划拆分成可执行的详细的特性任务 think ultra hard，文档放在 ./specs/w5/004-pg-mcp-tasks.md 文件中。

## 实现 pg-mcp

根据 ./specs/w5/004-pg-mcp-tasks.md 文档，实现 pg-mcp 的 phase 1 的全部功能。代码放在 ./week05/pg-mcp 目录下。

## pg-mcp test plan

根据 ./specs/w5/003-pg-mcp-impl-plan.md 和 ./specs/w5/002-pg-mcp-design.md 文档，构建 pg-mcp 的测试计划，think ultra hard，文档放在 ./specs/w5/005-pg-mcp-test-plan.md 文件中。

## 构建 pg-mcp 的测试用例

根据 ./specs/w5/001-pg-mcp-prd.md， 在 ./week05/pg-mcp/fixtures 下构建三个有意义的数据库，分别有少量，中等量级，以及大量的 table/view/types/index 等 schema，且有足够多的数据。生成这三个数据库的 sql 文件，并构建 Makefile 来重建这些测试数据库。

然后你来建立和测试这几个数据库确保可用

## pg-cmp 完整测试

对于 将 ./week05/pg-mcp 这个插件添加到当前trae项目的项目级MCP中。本地启动 pg-mcp server。


