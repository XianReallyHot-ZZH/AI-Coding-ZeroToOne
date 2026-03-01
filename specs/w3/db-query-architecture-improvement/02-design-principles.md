# 设计原则与目标

## 1. SOLID 原则应用

### 1.1 单一职责原则 (SRP - Single Responsibility Principle)

**定义**: 一个类应该只有一个引起它变化的原因。

**当前问题**:
```python
# ConnectionManager 承担了太多职责
class ConnectionManager:
    # 职责1: 引擎管理
    _engines: dict[str, Engine] = {}

    # 职责2: 数据库类型检测
    def get_db_type(connection_url: str) -> str: ...

    # 职责3: URL规范化 (MySQL特定)
    def normalize_mysql_url(url: str) -> str: ...

    # 职责4: 连接测试
    def test_connection(...) -> bool: ...

    # 职责5: 查询执行
    def execute_query(...) -> list[dict]: ...
```

**改进方案**:
```python
# 职责分离后的设计
class ConnectionPoolManager:       # 职责: 引擎缓存和连接池管理
    _engines: dict[str, Engine] = {}
    def get_engine(...): ...
    def remove_engine(...): ...

class DatabaseAdapterFactory:       # 职责: 根据URL创建适配器
    def create_from_url(url: str) -> DatabaseAdapter: ...

class QueryExecutor:                # 职责: 执行SQL并序列化结果
    def execute(engine: Engine, sql: str) -> QueryResult: ...
```

---

### 1.2 开闭原则 (OCP - Open-Close Principle)

**定义**: 软件实体应该对扩展开放，对修改关闭。

**当前问题**:
```python
# 每次添加新数据库都需要修改此函数
def get_db_type(connection_url: str) -> str:
    if connection_url.startswith(("mysql://", "mysql+pymysql://")):
        return "mysql"
    elif connection_url.startswith(("postgresql://", "postgres://")):
        return "postgresql"
    # 新增Oracle需要在这里添加 elif...
```

**改进方案**:
```python
# 使用注册表模式 - 添加新数据库无需修改此代码
class AdapterRegistry:
    _adapters: dict[str, DatabaseAdapter] = {}

    @classmethod
    def register(cls, adapter: DatabaseAdapter) -> None:
        for prefix in adapter.connection_prefixes:
            cls._adapters[prefix] = adapter

    @classmethod
    def get_adapter(cls, connection_url: str) -> DatabaseAdapter:
        for prefix, adapter in cls._adapters.items():
            if connection_url.startswith(prefix):
                return adapter
        raise UnsupportedDatabaseError(connection_url)

# 新数据库只需注册，无需修改现有代码
# adapters/oracle.py
class OracleAdapter(DatabaseAdapter):
    ...

# 在模块加载时自动注册
adapter_registry.register(OracleAdapter())
```

---

### 1.3 里氏替换原则 (LSP - Liskov Substitution Principle)

**定义**: 子类对象必须能够替换其父类对象，且程序行为正确。

**应用**:
```python
# 所有适配器都遵循相同的接口契约
class DatabaseAdapter(ABC):
    @abstractmethod
    def extract_schemas(self, inspector: Inspector) -> list[str]:
        """提取schema列表"""
        pass

    @abstractmethod
    def normalize_data_type(self, raw_type: str) -> str:
        """规范化数据类型"""
        pass

# 任何适配器都可以替换使用
def process_metadata(adapter: DatabaseAdapter, inspector: Inspector):
    # 不需要知道具体是哪个数据库
    schemas = adapter.extract_schemas(inspector)
    for schema in schemas:
        # 统一处理逻辑
        ...
```

---

### 1.4 接口隔离原则 (ISP - Interface Segregation Principle)

**定义**: 客户端不应该被迫依赖它不使用的接口。

**当前问题**:
```python
# 一个庞大的接口
class DatabaseAdapter(ABC):
    @abstractmethod
    def get_connection_config(self) -> dict: ...

    @abstractmethod
    def extract_schemas(self) -> list[str]: ...

    @abstractmethod
    def extract_tables(self) -> list[TableInfo]: ...

    @abstractmethod
    def extract_columns(self) -> list[ColumnInfo]: ...

    @abstractmethod
    def validate_sql(self, sql: str) -> bool: ...

    @abstractmethod
    def transform_sql(self, sql: str) -> str: ...

    @abstractmethod
    def get_nl_prompt(self) -> str: ...

    @abstractmethod
    def serialize_value(self, value: Any) -> Any: ...
```

**改进方案**:
```python
# 接口按职责拆分
class IConnectionConfig(Protocol):
    """连接配置接口"""
    @property
    @abstractmethod
    def connection_prefixes(self) -> list[str]: ...

    @abstractmethod
    def normalize_url(self, url: str) -> str: ...

    @abstractmethod
    def get_pool_config(self) -> PoolConfig: ...


class IMetadataExtractor(Protocol):
    """元数据提取接口"""
    @abstractmethod
    def extract_schemas(self, inspector: Inspector, connection_url: str) -> list[str]: ...

    @abstractmethod
    def normalize_data_type(self, raw_type: str) -> str: ...

    @abstractmethod
    def normalize_default_value(self, value: Any) -> Any: ...


class ISQLDialect(Protocol):
    """SQL方言接口"""
    @property
    @abstractmethod
    def sqlglot_dialect(self) -> str: ...

    @abstractmethod
    def get_identifier_quote_char(self) -> str: ...

    @abstractmethod
    def get_nl_system_prompt(self) -> str: ...


class IValueSerializer(Protocol):
    """值序列化接口"""
    @abstractmethod
    def serialize(self, value: Any) -> Any: ...

    @abstractmethod
    def get_supported_types(self) -> list[type]: ...


# 组合接口 - 完整的数据库适配器
class DatabaseAdapter(IConnectionConfig, IMetadataExtractor, ISQLDialect, IValueSerializer):
    """完整的数据库适配器，组合所有接口"""
    pass
```

---

### 1.5 依赖倒置原则 (DIP - Dependency Inversion Principle)

**定义**: 高层模块不应该依赖低层模块，两者都应该依赖抽象。

**当前问题**:
```python
# 服务层直接依赖具体实现
class MetadataService:
    @classmethod
    def extract_metadata(cls, db_name: str, connection_url: str, ...):
        db_type = get_db_type(connection_url)  # 直接调用函数

        if db_type == "mysql":  # 依赖具体类型判断
            schema_names = [connection_url.split("/")[-1].split("?")[0]]
        elif db_type == "postgresql":
            schema_names = ["public"]
        # ...
```

**改进方案**:
```python
# 服务层依赖抽象
class MetadataService:
    def __init__(self, adapter_factory: AdapterFactory):
        self._adapter_factory = adapter_factory

    def extract_metadata(self, db_name: str, connection_url: str, ...):
        # 通过工厂获取适配器，不关心具体类型
        adapter = self._adapter_factory.get_adapter(connection_url)

        # 调用抽象方法，由具体适配器实现
        schema_names = adapter.extract_schemas(inspector, connection_url)

        # 统一处理逻辑
        for schema in schema_names:
            tables = inspector.get_table_names(schema)
            # ...
```

---

## 2. 设计模式应用

### 2.1 适配器模式 (Adapter Pattern)

**目的**: 将不同数据库的接口转换为统一的接口。

```python
# 目标接口
class DatabaseAdapter(ABC):
    @abstractmethod
    def extract_schemas(self, inspector: Inspector) -> list[str]:
        pass

# 适配器实现
class MySQLAdapter(DatabaseAdapter):
    def extract_schemas(self, inspector: Inspector) -> list[str]:
        # 适配 MySQL 特有的 schema 概念
        # MySQL 中 schema = database
        return inspector.get_schema_names()

class SQLiteAdapter(DatabaseAdapter):
    def extract_schemas(self, inspector: Inspector) -> list[str]:
        # SQLite 没有 schema 概念，返回空或默认值
        return ["main"]
```

---

### 2.2 策略模式 (Strategy Pattern)

**目的**: 定义一系列算法，让它们可以互相替换。

```python
# 策略接口
class SQLTransformationStrategy(ABC):
    @abstractmethod
    def transform(self, sql: str) -> str:
        pass

# 具体策略
class MySQLTransformationStrategy(SQLTransformationStrategy):
    def transform(self, sql: str) -> str:
        # MySQL 特定的 SQL 转换
        return sql.replace('"', '`')

class PostgreSQLTransformationStrategy(SQLTransformationStrategy):
    def transform(self, sql: str) -> str:
        # PostgreSQL 特定的 SQL 转换
        return sql

# 上下文
class QueryTransformer:
    def __init__(self, strategy: SQLTransformationStrategy):
        self._strategy = strategy

    def transform(self, sql: str) -> str:
        return self._strategy.transform(sql)
```

---

### 2.3 工厂模式 (Factory Pattern)

**目的**: 创建对象而不暴露创建逻辑。

```python
# 抽象工厂
class DatabaseAdapterFactory(ABC):
    @abstractmethod
    def create_adapter(self, connection_url: str) -> DatabaseAdapter:
        pass

# 具体工厂
class DefaultAdapterFactory(DatabaseAdapterFactory):
    def __init__(self, registry: AdapterRegistry):
        self._registry = registry

    def create_adapter(self, connection_url: str) -> DatabaseAdapter:
        return self._registry.get_adapter(connection_url)

# 使用
factory = DefaultAdapterFactory(adapter_registry)
adapter = factory.create_adapter("mysql://user:pass@localhost/db")
```

---

### 2.4 注册表模式 (Registry Pattern)

**目的**: 提供一个全局访问点来管理和查找对象。

```python
class AdapterRegistry:
    """数据库适配器注册表"""

    _instance = None
    _adapters: dict[str, type[DatabaseAdapter]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def register(self, adapter_class: type[DatabaseAdapter]) -> None:
        """注册适配器"""
        instance = adapter_class()
        for prefix in instance.connection_prefixes:
            self._adapters[prefix] = instance

    def get_adapter(self, connection_url: str) -> DatabaseAdapter:
        """根据连接URL获取适配器"""
        for prefix, adapter in self._adapters.items():
            if connection_url.startswith(prefix):
                return adapter
        raise UnsupportedDatabaseError(f"No adapter for: {connection_url}")

    def list_supported_databases(self) -> list[str]:
        """列出所有支持的数据库"""
        return list({a.db_type for a in self._adapters.values()})


# 全局注册表实例
adapter_registry = AdapterRegistry()
```

---

### 2.5 模板方法模式 (Template Method Pattern)

**目的**: 定义算法骨架，将某些步骤延迟到子类实现。

```python
class MetadataExtractorBase(ABC):
    """元数据提取模板"""

    # 模板方法 - 定义算法骨架
    def extract(self, connection_url: str) -> MetadataResult:
        engine = self.create_engine(connection_url)
        inspector = self.create_inspector(engine)

        schemas = self.get_schemas(inspector, connection_url)
        result = MetadataResult()

        for schema in schemas:
            tables = self.get_tables(inspector, schema)
            for table in tables:
                columns = self.get_columns(inspector, schema, table)
                result.add_table(schema, table, columns)

        return result

    # 抽象方法 - 由子类实现
    @abstractmethod
    def get_schemas(self, inspector: Inspector, connection_url: str) -> list[str]:
        pass

    # 钩子方法 - 可选覆盖
    def get_tables(self, inspector: Inspector, schema: str) -> list[str]:
        return inspector.get_table_names(schema)

    def get_columns(self, inspector: Inspector, schema: str, table: str) -> list[dict]:
        return inspector.get_columns(table, schema)
```

---

## 3. 扩展性设计目标

### 3.1 添加新数据库的目标流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    添加新数据库支持                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 创建适配器文件                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/adapters/oracle.py                                 │   │
│  │  - 实现 DatabaseAdapter 接口                            │   │
│  │  - 定义 Oracle 特定行为                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│  Step 2: 注册适配器                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/adapters/__init__.py                               │   │
│  │  - from .oracle import OracleAdapter                    │   │
│  │  - adapter_registry.register(OracleAdapter)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│  Step 3: 添加驱动依赖                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pyproject.toml                                         │   │
│  │  - dependencies = [..., "cx-oracle>=8.0.0"]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│  Step 4: (可选) 编写测试                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  tests/adapters/test_oracle.py                          │   │
│  │  - 测试适配器行为                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✅ 无需修改任何现有代码！                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 配置驱动行为

```yaml
# config/databases/oracle.yaml
database:
  type: oracle
  connection_prefixes:
    - "oracle://"
    - "oracle+cx_oracle://"
  sqlglot_dialect: oracle
  features:
    supports_schemas: true
    supports_views: true
    default_schema: null  # Oracle 使用用户名作为 schema
  identifier_quote: '"'
  nl_prompt_additions: |
    - Use double quotes for identifiers
    - Use ROWNUM for limiting (pre-12c) or FETCH FIRST (12c+)
    - Use NVL instead of COALESCE for null handling
```

---

## 4. 可测试性设计

### 4.1 依赖注入支持

```python
# 使用 FastAPI 的依赖注入
from fastapi import Depends

def get_adapter_factory() -> AdapterFactory:
    return DefaultAdapterFactory(adapter_registry)

@app.post("/query")
async def execute_query(
    request: QueryRequest,
    adapter_factory: AdapterFactory = Depends(get_adapter_factory),
    query_service: QueryService = Depends(get_query_service)
):
    adapter = adapter_factory.get_adapter(request.connection_url)
    return query_service.execute(adapter, request.sql)
```

### 4.2 模拟适配器

```python
# 测试中使用模拟适配器
class MockAdapter(DatabaseAdapter):
    def __init__(self, db_type: str = "mock"):
        self._db_type = db_type

    @property
    def db_type(self) -> str:
        return self._db_type

    # ... 实现其他方法

# 注册模拟适配器
mock_registry = AdapterRegistry()
mock_registry.register(MockAdapter("mysql"))
mock_registry.register(MockAdapter("postgresql"))

# 使用模拟注册表进行测试
factory = DefaultAdapterFactory(mock_registry)
```

---

## 5. 向后兼容性保证

### 5.1 API 不变

```python
# API 端点签名保持不变
@app.post("/databases")
async def create_connection(
    request: DatabaseConnectionCreate,
    repo: ConnectionRepository = Depends(get_connection_repo)
) -> DatabaseConnectionResponse:
    # 内部使用新架构，但接口不变
    ...
```

### 5.2 数据模型不变

```python
# Pydantic 模型保持兼容
class DatabaseConnectionResponse(BaseResponseModel):
    name: str
    connection_url: str
    db_type: str  # 仍然返回字符串类型
    created_at: datetime
    last_used_at: datetime | None
```

### 5.3 渐进式迁移

```python
# 阶段1: 保留旧接口，添加新接口
def get_db_type(connection_url: str) -> str:
    # 旧方法保留，内部委托给新实现
    adapter = adapter_registry.get_adapter(connection_url)
    return adapter.db_type

# 阶段2: 标记旧方法为废弃
@deprecated("Use adapter_registry.get_adapter() instead")
def get_db_type(connection_url: str) -> str:
    ...

# 阶段3: 移除旧方法 (在主版本升级时)
```
