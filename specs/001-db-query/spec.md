# Feature Specification: Database Query Tool

**Feature Branch**: `001-db-query`  
**Created**: 2026-02-23  
**Status**: Draft  
**Input**: User description: "数据库查询工具，支持添加数据库连接、浏览元数据、手动SQL查询和自然语言生成SQL"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Database Connection (Priority: P1)

用户添加一个新的数据库连接，系统连接数据库并获取其元数据信息（表、视图、列等）。

**Why this priority**: 这是所有其他功能的基础。没有数据库连接，用户无法进行任何查询操作。

**Independent Test**: 用户输入一个有效的数据库连接字符串，系统能够成功连接并显示连接成功消息。

**Acceptance Scenarios**:

1. **Given** 用户在数据库连接页面, **When** 用户输入有效的PostgreSQL连接字符串并点击连接, **Then** 系统成功连接数据库并显示"连接成功"
2. **Given** 用户输入了无效的连接字符串, **When** 用户点击连接, **Then** 系统显示具体的错误信息（如"无法连接到主机"或"认证失败"）
3. **Given** 用户成功连接数据库, **When** 连接完成后, **Then** 系统自动获取并存储数据库元数据

---

### User Story 2 - Browse Database Metadata (Priority: P1)

用户浏览已连接数据库的表和视图列表，查看每个表的列信息、数据类型等详细元数据。

**Why this priority**: 用户需要了解数据库结构才能编写有效的查询。这是SQL编辑和自然语言查询的前置条件。

**Independent Test**: 用户选择一个已连接的数据库，系统能够显示该数据库中所有表和视图的列表及其详细信息。

**Acceptance Scenarios**:

1. **Given** 用户已成功连接数据库, **When** 用户进入元数据浏览页面, **Then** 系统显示该数据库所有表和视图的列表
2. **Given** 用户正在查看表列表, **When** 用户点击某个表名, **Then** 系统显示该表的所有列信息（列名、数据类型、是否可空等）
3. **Given** 数据库元数据已缓存, **When** 用户再次访问同一数据库, **Then** 系统直接从缓存加载元数据而无需重新查询数据库

---

### User Story 3 - Execute Manual SQL Query (Priority: P1)

用户在SQL编辑器中手动输入SELECT语句并执行，查看查询结果。

**Why this priority**: 这是核心功能之一，允许有SQL知识的用户直接查询数据。

**Independent Test**: 用户输入一个简单的SELECT语句，系统能够执行并返回结果表格。

**Acceptance Scenarios**:

1. **Given** 用户在SQL编辑器页面, **When** 用户输入"SELECT * FROM users LIMIT 10"并执行, **Then** 系统显示查询结果表格（最多10行）
2. **Given** 用户输入不含LIMIT子句的SELECT语句, **When** 执行查询, **Then** 系统自动添加LIMIT 1000并返回结果
3. **Given** 用户输入INSERT/UPDATE/DELETE等非SELECT语句, **When** 执行查询, **Then** 系统拒绝执行并显示"仅允许SELECT语句"
4. **Given** 用户输入语法错误的SQL, **When** 执行查询, **Then** 系统显示具体的语法错误信息

---

### User Story 4 - Generate SQL via Natural Language (Priority: P2)

用户使用自然语言描述想要查询的内容，系统使用LLM生成对应的SQL语句，用户确认后执行。

**Why this priority**: 这是差异化功能，降低了SQL查询的门槛，让非技术用户也能查询数据。

**Independent Test**: 用户输入自然语言描述，系统能够生成有效的SQL语句并显示给用户。

**Acceptance Scenarios**:

1. **Given** 用户在自然语言查询页面, **When** 用户输入"查询所有活跃用户的邮箱和注册日期", **Then** 系统生成对应的SELECT语句并显示
2. **Given** 系统生成了SQL语句, **When** 用户查看生成的SQL, **Then** 用户可以看到完整的SQL并选择执行或修改
3. **Given** 用户确认执行生成的SQL, **When** 点击执行按钮, **Then** 系统执行SQL并显示结果

---

### Edge Cases

- 当数据库连接超时时会发生什么？系统应显示超时错误并建议检查网络或连接参数
- 当数据库包含大量表（>1000）时，元数据加载如何处理？系统应分页或延迟加载
- 当LLM生成的SQL不正确时如何处理？用户可以手动修改生成的SQL后再执行
- 当查询结果包含大量数据时如何处理？系统已通过LIMIT限制，但仍需支持结果分页显示

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须支持用户添加PostgreSQL数据库连接字符串
- **FR-002**: 系统必须验证连接字符串格式并尝试建立连接
- **FR-003**: 系统必须在成功连接后自动获取数据库元数据（表、视图、列信息）
- **FR-004**: 系统必须将数据库连接信息和元数据持久化存储到本地SQLite数据库
- **FR-005**: 系统必须展示已连接数据库的表和视图列表
- **FR-006**: 系统必须展示每个表的详细列信息（列名、数据类型、约束等）
- **FR-007**: 系统必须提供SQL编辑器供用户输入和执行SELECT语句
- **FR-008**: 系统必须使用SQL解析器验证所有SQL语句的语法正确性
- **FR-009**: 系统必须拒绝执行任何非SELECT语句（INSERT/UPDATE/DELETE/DROP等）
- **FR-010**: 系统必须对不含LIMIT子句的查询自动添加LIMIT 1000
- **FR-011**: 系统必须将查询结果以JSON格式返回，前端展示为表格
- **FR-012**: 系统必须提供自然语言输入界面
- **FR-013**: 系统必须使用LLM将自然语言转换为SQL SELECT语句
- **FR-014**: 系统必须将数据库元数据作为上下文提供给LLM以生成准确的SQL
- **FR-015**: 系统必须允许用户在执行前审核和修改LLM生成的SQL

### Key Entities

- **DatabaseConnection**: 表示一个数据库连接配置，包含连接字符串、连接名称、创建时间等
- **TableMetadata**: 表示数据库表的元数据，包含表名、模式名、表类型（表/视图）
- **ColumnMetadata**: 表示表列的元数据，包含列名、数据类型、是否可空、是否主键等
- **QueryResult**: 表示查询执行结果，包含列定义和数据行
- **GeneratedQuery**: 表示LLM生成的SQL查询，包含原始自然语言输入和生成的SQL

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户能在30秒内完成一个新数据库连接的添加和元数据加载
- **SC-002**: 90%的有效SELECT语句能在5秒内返回查询结果（针对1000行以内的结果集）
- **SC-003**: 系统能100%准确识别并拒绝非SELECT语句
- **SC-004**: 元数据缓存能使重复访问同一数据库的加载时间减少80%以上
- **SC-005**: LLM生成的SQL在简单查询场景下（单表查询、基本条件筛选）准确率达到80%以上
- **SC-006**: 用户能在10秒内通过自然语言获得可执行的SQL语句

## Assumptions

- 用户有权限访问目标数据库
- 目标数据库主要是PostgreSQL（初期版本）
- 用户具备基本的数据库概念理解（表、列、查询）
- LLM服务（如OpenAI）可正常访问
- 网络连接稳定
