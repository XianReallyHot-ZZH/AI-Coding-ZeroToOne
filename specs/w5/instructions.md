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

根据 ./week05/pg-mcp/fixtures 下的 makefile 文件和 sql 文件，使用本地的 postgres 数据库来构建测试数据库。

## 生成自然语言测试数据集

根据 ./week05/pg-mcp/fixtures 下的 sql 文件，生成自然语言测试数据集，以用来测试 pg-mcp 的功能。测试数据集写入 ./week05/pg-mcp/fixtures/test-querys.md 文件中。


## pg-cmp 完整测试

将 ./week05/pg-mcp 这个插件添加到当前trae项目的项目级MCP中。启动 pg-mcp ，然后在 trae 对话中测试 pg-mcp 的功能。

## 使用 skill 来构建类似的查询

在当前项目下创建一个新的 skill，要求：

1. 首先通过 psql (localhost:5432, 用户：postgres, 密码：123456) 探索这几个数据库：pg_mcp_test_small、pg_mcp_test_medium、pg_mcp_test_large，了解它们都有哪些 table/view/types/index 等等，每个数据库一个 md 文件，作为 skill 的 reference。
2. 用户可以给特定自然语言描述的查询的需求，skill 根据用户输入找到相应的数据库的 reference 文件，然后根据这些信息以及用户的输入来生成正确的 SQL。SQL只允许查询语句，不能有任何的写操作，不能有任何安全漏洞比如 SQL 注入，不能有任何危险的操作比如 sleep，不能有任何的敏感信息比如 API Key 等。
3. 使用 psql 测试这个 SQL 确保它能够执行并且返回有意义的结果。如果执行失败，则深度思考，重新生成 SQL，回到第 3 步。
4. 把用户的输入，生成的 SQL，以及返回的结果的一部分进行分析来确认结果是不是有意义，根据分析打个分数。10分非常 confident，0分非常不 confident。如果小于 7 分，则深度思考，重新生成 SQL，回到第 3 步。
5. 最后根据用户的输入是返回 SQL 还是返回 SQL 查询之后的结果（默认）来返回相应的内容


### 测试 skill

pg-query Skill 使用方法

  基本用法

  /pg-query <自然语言查询>

  两种模式

  ┌──────────┬───────────────────────────────────┬─────────────────────┐
  │   模式   │               命令                │        说明         │
  ├──────────┼───────────────────────────────────┼─────────────────────┤
  │ 默认模式 │ /pg-query 查询所有用户            │ 返回 SQL + 执行结果 │
  ├──────────┼───────────────────────────────────┼─────────────────────┤
  │ 仅 SQL   │ /pg-query 查询所有用户 --sql-only │ 只返回 SQL，不执行  │
  └──────────┴───────────────────────────────────┴─────────────────────┘

  可用的数据库

  ┌────────────────────┬────────────────────────────────────────────────┬──────────┐
  │       数据库       │                     关键词                     │   用途   │
  ├────────────────────┼────────────────────────────────────────────────┼──────────┤
  │ pg_mcp_test_small  │ post, comment, tag, author, blog, article      │ 博客系统 │
  ├────────────────────┼────────────────────────────────────────────────┼──────────┤
  │ pg_mcp_test_medium │ order, product, cart, payment, shipping, brand │ 电商系统 │
  ├────────────────────┼────────────────────────────────────────────────┼──────────┤
  │ pg_mcp_test_large  │ employee, department, invoice, deal, project   │ ERP 系统 │
  └────────────────────┴────────────────────────────────────────────────┴──────────┘

  示例查询

  博客系统:
  /pg-query 查询所有已发布的文章
  /pg-query 查找浏览量超过1000的文章 --sql-only
  /pg-query 统计每个用户的文章数量

  电商系统:
  /pg-query 显示价格低于100美元的活跃产品
  /pg-query 查询最近7天已发货的订单
  /pg-query 列出库存不足的产品

  ERP 系统:
  /pg-query 列出IT部门的所有活跃员工
  /pg-query 查找处于谈判阶段的交易
  /pg-query 显示逾期的发票

  工作流程

  1. 识别数据库 - 根据关键词自动选择数据库
  2. 读取参考文件 - 了解表结构
  3. 生成 SQL - 基于自然语言生成安全的 SELECT 语句
  4. 安全验证 - 只允许 SELECT，阻止危险操作
  5. 执行查询 - 连接数据库执行（非 --sql-only 模式）
  6. 评估结果 - 如果结果不理想会重试（最多3次）

