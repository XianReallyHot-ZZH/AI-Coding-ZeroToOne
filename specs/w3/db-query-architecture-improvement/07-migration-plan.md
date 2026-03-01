# 迁移计划

## 1. 迁移策略

采用**渐进式迁移**策略，确保系统在迁移过程中保持可用。

### 1.1 迁移原则

1. **向后兼容**: 现有 API 和行为保持不变
2. **渐进式**: 分阶段迁移，每个阶段可独立测试
3. **可回滚**: 每个阶段都可以安全回滚
4. **零停机**: 迁移过程中服务持续可用

---

## 2. 迁移阶段

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           迁移时间线                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1          Phase 2          Phase 3          Phase 4             │
│  基础设施         适配器实现        服务层迁移        清理与优化          │
│  ──────────       ──────────       ──────────       ──────────          │
│                                                                          │
│  创建适配器       实现MySQL        重构服务         移除旧代码           │
│  基类/接口        SQLite           使用新接口        更新测试             │
│  创建注册表       PostgreSQL       更新API          文档更新             │
│  创建工厂                                                              │
│                                                                          │
│  风险: 低         风险: 低         风险: 中         风险: 低             │
│  耗时: 2天        耗时: 2天        耗时: 2天        耗时: 1天            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: 基础设施搭建

### 3.1 目标
- 创建适配器模块目录结构
- 实现基类和接口
- 实现注册表和工厂
- 不影响现有代码

### 3.2 任务清单

| 任务 | 文件 | 状态 |
|------|------|------|
| 创建适配器目录 | `src/adapters/` | ⬜ |
| 实现基类 | `src/adapters/base.py` | ⬜ |
| 实现异常类 | `src/adapters/exceptions.py` | ⬜ |
| 实现注册表 | `src/adapters/registry.py` | ⬜ |
| 实现工厂 | `src/adapters/factory.py` | ⬜ |
| 创建模块导出 | `src/adapters/__init__.py` | ⬜ |
| 编写单元测试 | `tests/adapters/test_base.py` | ⬜ |

### 3.3 验收标准

```python
# 测试基础设施
from adapters import adapter_registry, adapter_factory

# 1. 注册表可以工作
assert adapter_registry.list_supported_databases() == []

# 2. 可以注册适配器
class MockAdapter(DatabaseAdapter):
    @property
    def db_type(self) -> str:
        return "mock"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["mock://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "mock"

adapter_registry.register(MockAdapter())
assert "mock" in adapter_registry.list_supported_databases()
```

---

## 4. Phase 2: 适配器实现

### 4.1 目标
- 实现 MySQL 适配器
- 实现 SQLite 适配器
- 实现 PostgreSQL 适配器
- 验证适配器功能正确

### 4.2 任务清单

| 任务 | 文件 | 状态 |
|------|------|------|
| 实现 MySQL 适配器 | `src/adapters/mysql.py` | ⬜ |
| 实现 SQLite 适配器 | `src/adapters/sqlite.py` | ⬜ |
| 实现 PostgreSQL 适配器 | `src/adapters/postgresql.py` | ⬜ |
| 注册适配器 | `src/adapters/__init__.py` | ⬜ |
| MySQL 适配器测试 | `tests/adapters/test_mysql.py` | ⬜ |
| SQLite 适配器测试 | `tests/adapters/test_sqlite.py` | ⬜ |
| PostgreSQL 适配器测试 | `tests/adapters/test_postgresql.py` | ⬜ |

### 4.3 验收标准

```python
# 测试适配器
from adapters import adapter_registry

# 1. 所有适配器已注册
assert "mysql" in adapter_registry.list_supported_databases()
assert "sqlite" in adapter_registry.list_supported_databases()
assert "postgresql" in adapter_registry.list_supported_databases()

# 2. 可以通过 URL 获取适配器
mysql_adapter = adapter_registry.get_adapter("mysql://localhost/db")
assert mysql_adapter.db_type == "mysql"

# 3. 适配器功能正确
assert mysql_adapter.identifier_quote_char == "`"
assert mysql_adapter.normalize_url("mysql://localhost/db") == \
       "mysql+pymysql://localhost/db"
```

---

## 5. Phase 3: 服务层迁移

### 5.1 目标
- 重构服务层使用适配器
- 保持 API 向后兼容
- 保留旧接口作为兼容层

### 5.1 URL 验证迁移

```python
# 旧代码 (src/models/database.py)
class DatabaseConnectionCreate(BaseModel):
    @field_validator("connection_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        valid_prefixes = [
            "mysql://", "mysql+pymysql://",
            "postgresql://", "postgres://",
            "sqlite://",
        ]
        if not any(v.startswith(p) for p in valid_prefixes):
            raise ValueError(f"Invalid URL. Valid prefixes: {valid_prefixes}")
        return v

# 新代码 (Phase 3)
from adapters import adapter_registry

class DatabaseConnectionCreate(BaseModel):
    @field_validator("connection_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not adapter_registry.is_supported(v):
            supported = adapter_registry.list_all_prefixes()
            raise ValueError(f"Unsupported URL. Supported: {supported}")
        return v
```

### 5.2 查询服务迁移

```python
# 旧代码 (src/services/query.py)
def _get_sqlglot_dialect(db_type: str) -> str:
    dialect_map = {
        "mysql": "mysql",
        "postgresql": "postgres",
        "postgres": "postgres",
        "sqlite": "sqlite",
    }
    return dialect_map.get(db_type, "sqlite")

# 新代码 (Phase 3)
from adapters import adapter_factory

def validate_sql(sql: str, connection_url: str) -> tuple[bool, str]:
    adapter = adapter_factory.get_adapter(connection_url)
    # 使用适配器的方言
    dialect = adapter.sqlglot_dialect
    ...
```

### 5.3 元数据服务迁移

```python
# 旧代码 (src/services/metadata.py)
db_type = get_db_type(connection_url)
if db_type == "mysql":
    schema_names = [connection_url.split("/")[-1].split("?")[0]]
elif db_type == "postgresql":
    schema_names = ["public"]
else:
    schema_names = inspector.get_schema_names()

# 新代码 (Phase 3)
from adapters import adapter_factory

adapter = adapter_factory.get_adapter(connection_url)
schemas = adapter.extract_schemas(inspector, connection_url)
schema_names = [s.name for s in schemas]
```

### 5.4 任务清单

| 任务 | 文件 | 状态 |
|------|------|------|
| 迁移 URL 验证 | `src/models/database.py` | ⬜ |
| 迁移查询服务 | `src/services/query.py` | ⬜ |
| 迁移元数据服务 | `src/services/metadata.py` | ⬜ |
| 迁移自然语言服务 | `src/services/nl_query.py` | ⬜ |
| 迁移连接服务 | `src/services/connection.py` | ⬜ |
| 集成测试 | `tests/integration/` | ⬜ |

### 5.5 兼容层设计

```python
# src/services/connection.py (兼容层)

# 保留旧函数，标记为废弃
import warnings
from adapters import adapter_factory

@warnings.deprecated("Use adapter_factory.get_db_type() instead")
def get_db_type(connection_url: str) -> str:
    """已废弃: 使用 adapter_factory.get_db_type()"""
    return adapter_factory.get_db_type(connection_url)
```

---

## 6. Phase 4: 清理与优化

### 6.1 目标
- 移除旧代码和兼容层
- 更新文档
- 性能优化

### 6.2 任务清单

| 任务 | 描述 | 状态 |
|------|------|------|
| 移除旧代码 | 删除废弃的函数和类 | ⬜ |
| 更新 README | 反映新架构 | ⬜ |
| 更新 API 文档 | 更新接口说明 | ⬜ |
| 性能测试 | 确保无性能退化 | ⬜ |
| 代码审查 | 确保代码质量 | ⬜ |

---

## 7. 风险与缓解

### 7.1 风险矩阵

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 破坏现有功能 | 中 | 高 | 完整的回归测试 |
| 性能退化 | 低 | 中 | 性能基准测试 |
| 迁移时间超期 | 中 | 中 | 分阶段交付 |
| 团队学习曲线 | 低 | 低 | 提供培训和文档 |

### 7.2 回滚计划

每个阶段都有明确的回滚点：

```
Phase 1 回滚: 删除 adapters 目录
Phase 2 回滚: 取消适配器注册
Phase 3 回滚: 恢复旧的服务层代码
Phase 4 回滚: 恢复兼容层
```

---

## 8. 测试策略

### 8.1 单元测试

```python
# tests/adapters/test_mysql.py
def test_mysql_adapter_normalize_url():
    adapter = MySQLAdapter()
    assert adapter.normalize_url("mysql://localhost/db") == \
           "mysql+pymysql://localhost/db"

def test_mysql_adapter_extract_schemas():
    adapter = MySQLAdapter()
    schemas = adapter.extract_schemas(None, "mysql://localhost/mydb")
    assert schemas[0].name == "mydb"
```

### 8.2 集成测试

```python
# tests/integration/test_query_with_adapter.py
def test_execute_query_mysql(mysql_connection):
    """测试 MySQL 查询使用适配器"""
    sql = "SELECT * FROM users LIMIT 10"
    rows, columns, truncated = QueryService.execute_query(
        "test_db",
        mysql_connection,
        sql
    )
    assert len(rows) <= 10
    assert not truncated
```

### 8.3 回归测试

确保所有现有测试在迁移后继续通过：

```bash
# 运行所有测试
pytest tests/ -v

# 特定测试
pytest tests/test_mysql_integration.py -v
```

---

## 9. 时间表

| 阶段 | 开始 | 结束 | 工作日 |
|------|------|------|--------|
| Phase 1 | Day 1 | Day 2 | 2 |
| Phase 2 | Day 3 | Day 4 | 2 |
| Phase 3 | Day 5 | Day 6 | 2 |
| Phase 4 | Day 7 | Day 7 | 1 |
| **总计** | | | **7** |

---

## 10. 检查清单

### Phase 1 完成标准
- [ ] 适配器基类实现完成
- [ ] 注册表和工厂实现完成
- [ ] 单元测试通过
- [ ] 代码审查通过

### Phase 2 完成标准
- [ ] 所有数据库适配器实现完成
- [ ] 适配器单元测试通过
- [ ] 适配器注册正常

### Phase 3 完成标准
- [ ] 服务层迁移完成
- [ ] API 向后兼容
- [ ] 集成测试通过
- [ ] 回归测试通过

### Phase 4 完成标准
- [ ] 旧代码清理完成
- [ ] 文档更新完成
- [ ] 性能测试通过
- [ ] 最终代码审查通过
