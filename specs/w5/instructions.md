# instructions

## 构建 mcp server

主要的需求是在Python下面创建一个Postgres的mcp：用户可以给特定自然语言描述的查询的需求，然后mcp server 根据结果来返回一个SQL或者返回这个查询的结果。mcp的服务器在启动的时候，应该读取它都有哪些可以访问的数据库，并且缓存这些数据库的schema：了解每一个数据库下面都有哪些 table/view/types/index 等等，然后根据这些信息以及用户的输入去调用deepseek的大模型来生成 SQL。之后mcp server应该来校验这个sql只允许查询的语句,然后测试这个sql确保它能够执行并且返回有意义的结果：这里也可以把用户的输入生成的sql以及返回的结果的一部分调用openai来确认这样可以确保它的结果是不是有意义。最后根据用户的输入是返回SQL还是返回SQL查询之后的结果来返回相应的内容根据这些需求帮我构建一个详细的需求文档，先不要著急去做设计，等我review完这个需求文档之后呢我们再来讨论设计，文档放在 ./specs/w5/001-pg-mcp-prd.md 文件中。

## commit/review

commit code; 然后，接口目前只需要 query 即可，其它意义不大；另外调用 codex review skill 让 codex review 这个需求文档，并更新

## 构建 pg-mcp 的设计文档

根据 ./specs/w5/001-pg-mcp-prd.md 文档，使用 FastMCP、Asyncpg、SQLGlot、Pydantic 以及 deepseek 构建 pg-mcp 的设计文档，文档放在 ./specs/w5/002-pg-mcp-design.md 文件中。




