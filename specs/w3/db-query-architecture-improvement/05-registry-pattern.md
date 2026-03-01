# 适配器注册机制

## 1. 注册表设计

```python
# src/adapters/registry.py
from typing import Type, Optional
from threading import Lock

from .base import DatabaseAdapter
from .exceptions import (
    AdapterNotFoundError,
    UnsupportedDatabaseError,
    AdapterRegistrationError,
)


class AdapterRegistry:
    """
    数据库适配器注册表

    特点:
    - 单例模式
    - 线程安全
    - 支持按URL前缀查找
    - 支持按类型名称查找
    - 支持动态注册/注销
    """

    _instance: Optional["AdapterRegistry"] = None
    _lock: Lock = Lock()

    def __new__(cls) -> "AdapterRegistry":
        """单例模式"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._adapters: dict[str, DatabaseAdapter] = {}
                    cls._instance._type_index: dict[str, DatabaseAdapter] = {}
        return cls._instance

    def register(self, adapter: DatabaseAdapter) -> None:
        """
        注册适配器

        Args:
            adapter: 数据库适配器实例

        Raises:
            AdapterRegistrationError: 注册失败
        """
        if not isinstance(adapter, DatabaseAdapter):
            raise AdapterRegistrationError(
                adapter.__class__.__name__,
                "Must be an instance of DatabaseAdapter"
            )

        db_type = adapter.db_type

        # 检查类型是否已注册
        if db_type in self._type_index:
            # 允许覆盖，但记录警告
            import warnings
            warnings.warn(
                f"Adapter for {db_type} is being replaced",
                UserWarning
            )

        # 注册所有 URL 前缀
        for prefix in adapter.connection_prefixes:
            self._adapters[prefix] = adapter

        # 建立类型索引
        self._type_index[db_type] = adapter

    def unregister(self, db_type: str) -> bool:
        """
        注销适配器

        Args:
            db_type: 数据库类型

        Returns:
            bool: 是否成功注销
        """
        if db_type not in self._type_index:
            return False

        adapter = self._type_index[db_type]

        # 移除前缀映射
        for prefix in adapter.connection_prefixes:
            self._adapters.pop(prefix, None)

        # 移除类型索引
        del self._type_index[db_type]

        return True

    def get_adapter(self, connection_url: str) -> DatabaseAdapter:
        """
        根据连接URL获取适配器

        Args:
            connection_url: 数据库连接URL

        Returns:
            DatabaseAdapter: 匹配的适配器

        Raises:
            UnsupportedDatabaseError: 没有找到匹配的适配器
        """
        for prefix, adapter in self._adapters.items():
            if connection_url.startswith(prefix):
                return adapter

        raise UnsupportedDatabaseError(connection_url)

    def get_adapter_by_type(self, db_type: str) -> DatabaseAdapter:
        """
        根据类型名称获取适配器

        Args:
            db_type: 数据库类型

        Returns:
            DatabaseAdapter: 匹配的适配器

        Raises:
            AdapterNotFoundError: 没有找到匹配的适配器
        """
        if db_type not in self._type_index:
            raise AdapterNotFoundError(db_type)

        return self._type_index[db_type]

    def list_supported_databases(self) -> list[str]:
        """
        列出所有支持的数据库类型

        Returns:
            list[str]: 数据库类型列表
        """
        return list(self._type_index.keys())

    def list_all_prefixes(self) -> list[str]:
        """
        列出所有支持的URL前缀

        Returns:
            list[str]: URL前缀列表
        """
        return list(self._adapters.keys())

    def is_supported(self, connection_url: str) -> bool:
        """
        检查URL是否被支持

        Args:
            connection_url: 数据库连接URL

        Returns:
            bool: 是否支持
        """
        try:
            self.get_adapter(connection_url)
            return True
        except UnsupportedDatabaseError:
            return False

    def clear(self) -> None:
        """清空所有注册的适配器"""
        self._adapters.clear()
        self._type_index.clear()


# 全局注册表实例
adapter_registry = AdapterRegistry()
```

---

## 2. 适配器工厂

```python
# src/adapters/factory.py
from functools import lru_cache

from sqlalchemy import Engine, create_engine, inspect
from sqlalchemy.pool import QueuePool

from .base import DatabaseAdapter, PoolConfig
from .registry import adapter_registry
from .exceptions import UnsupportedDatabaseError


class AdapterFactory:
    """
    适配器工厂

    职责:
    - 根据URL创建适配器
    - 缓存适配器实例
    - 创建引擎和检查器
    """

    def __init__(self, registry: AdapterRegistry = None):
        self._registry = registry or adapter_registry
        self._adapter_cache: dict[str, DatabaseAdapter] = {}

    def get_adapter(self, connection_url: str) -> DatabaseAdapter:
        """
        获取适配器（带缓存）

        Args:
            connection_url: 连接URL

        Returns:
            DatabaseAdapter: 适配器实例
        """
        # 检查缓存
        if connection_url in self._adapter_cache:
            return self._adapter_cache[connection_url]

        # 从注册表获取
        adapter = self._registry.get_adapter(connection_url)

        # 缓存
        self._adapter_cache[connection_url] = adapter

        return adapter

    def get_adapter_by_type(self, db_type: str) -> DatabaseAdapter:
        """根据类型获取适配器"""
        return self._registry.get_adapter_by_type(db_type)

    def create_engine(
        self,
        connection_url: str,
        **kwargs
    ) -> Engine:
        """
        创建 SQLAlchemy 引擎

        Args:
            connection_url: 连接URL
            **kwargs: 额外的引擎参数

        Returns:
            Engine: SQLAlchemy 引擎
        """
        adapter = self.get_adapter(connection_url)

        # 规范化URL
        normalized_url = adapter.normalize_url(connection_url)

        # 获取连接池配置
        pool_config = adapter.get_pool_config(connection_url)

        # 合并配置
        engine_kwargs = {
            "poolclass": QueuePool,
            "pool_size": pool_config.pool_size,
            "max_overflow": pool_config.max_overflow,
            "pool_pre_ping": pool_config.pool_pre_ping,
            **kwargs
        }

        if pool_config.pool_recycle:
            engine_kwargs["pool_recycle"] = pool_config.pool_recycle

        return create_engine(normalized_url, **engine_kwargs)

    def create_inspector(self, engine: Engine):
        """创建 SQLAlchemy Inspector"""
        return inspect(engine)

    def validate_connection_url(self, connection_url: str) -> tuple[bool, str | None]:
        """
        验证连接URL

        Args:
            connection_url: 连接URL

        Returns:
            tuple[bool, str | None]: (是否有效, 错误信息)
        """
        try:
            adapter = self.get_adapter(connection_url)
            return adapter.validate_url(connection_url)
        except UnsupportedDatabaseError as e:
            return False, str(e)

    def get_db_type(self, connection_url: str) -> str:
        """
        获取数据库类型

        Args:
            connection_url: 连接URL

        Returns:
            str: 数据库类型
        """
        adapter = self.get_adapter(connection_url)
        return adapter.db_type

    def clear_cache(self) -> None:
        """清空适配器缓存"""
        self._adapter_cache.clear()


# 全局工厂实例
adapter_factory = AdapterFactory()
```

---

## 3. 自动发现机制

```python
# src/adapters/discovery.py
import importlib
import pkgutil
from pathlib import Path
from typing import Type

from .base import DatabaseAdapter
from .registry import adapter_registry


def discover_adapters(package_path: str = "src.adapters") -> list[Type[DatabaseAdapter]]:
    """
    自动发现适配器类

    扫描指定包下的所有模块，查找 DatabaseAdapter 的子类。

    Args:
        package_path: 包路径

    Returns:
        list[Type[DatabaseAdapter]]: 发现的适配器类列表
    """
    adapters = []

    try:
        package = importlib.import_module(package_path)
    except ImportError:
        return adapters

    package_dir = Path(package.__file__).parent

    for _, module_name, _ in pkgutil.iter_modules([str(package_dir)]):
        # 跳过特殊模块
        if module_name.startswith("_"):
            continue

        # 跳过非适配器模块
        if module_name in ("base", "registry", "factory", "exceptions", "discovery"):
            continue

        try:
            module = importlib.import_module(f"{package_path}.{module_name}")

            # 查找适配器类
            for name in dir(module):
                obj = getattr(module, name)

                # 检查是否是适配器类
                if (
                    isinstance(obj, type)
                    and issubclass(obj, DatabaseAdapter)
                    and obj is not DatabaseAdapter
                ):
                    adapters.append(obj)

        except ImportError as e:
            import warnings
            warnings.warn(f"Failed to import adapter module {module_name}: {e}")

    return adapters


def auto_register(package_path: str = "src.adapters") -> None:
    """
    自动发现并注册所有适配器

    Args:
        package_path: 包路径
    """
    adapters = discover_adapters(package_path)

    for adapter_class in adapters:
        try:
            adapter = adapter_class()
            adapter_registry.register(adapter)
        except Exception as e:
            import warnings
            warnings.warn(f"Failed to register adapter {adapter_class.__name__}: {e}")
```

---

## 4. 配置驱动的注册

```yaml
# config/adapters.yaml
adapters:
  mysql:
    enabled: true
    class: src.adapters.mysql.MySQLAdapter

  sqlite:
    enabled: true
    class: src.adapters.sqlite.SQLiteAdapter

  postgresql:
    enabled: true
    class: src.adapters.postgresql.PostgreSQLAdapter

  oracle:
    enabled: false  # 可通过配置禁用
    class: src.adapters.oracle.OracleAdapter
```

```python
# src/adapters/config_loader.py
import yaml
from pathlib import Path

from .base import DatabaseAdapter
from .registry import adapter_registry


def load_adapters_from_config(config_path: str = "config/adapters.yaml") -> None:
    """
    从配置文件加载适配器

    Args:
        config_path: 配置文件路径
    """
    config_file = Path(config_path)

    if not config_file.exists():
        return

    with open(config_file, "r") as f:
        config = yaml.safe_load(f)

    for adapter_name, adapter_config in config.get("adapters", {}).items():
        if not adapter_config.get("enabled", True):
            continue

        class_path = adapter_config.get("class")
        if not class_path:
            continue

        # 动态导入
        module_path, class_name = class_path.rsplit(".", 1)
        module = __import__(module_path, fromlist=[class_name])
        adapter_class = getattr(module, class_name)

        # 注册
        adapter = adapter_class()
        adapter_registry.register(adapter)
```

---

## 5. 依赖注入集成

### 5.1 FastAPI 依赖

```python
# src/dependencies.py
from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from adapters.factory import AdapterFactory, adapter_factory
from adapters.registry import AdapterRegistry, adapter_registry


@lru_cache
def get_adapter_registry() -> AdapterRegistry:
    """获取适配器注册表（单例）"""
    return adapter_registry


@lru_cache
def get_adapter_factory() -> AdapterFactory:
    """获取适配器工厂（单例）"""
    return adapter_factory


# 类型别名，简化依赖注入
RegistryDep = Annotated[AdapterRegistry, Depends(get_adapter_registry)]
AdapterFactoryDep = Annotated[AdapterFactory, Depends(get_adapter_factory)]


# 使用示例
# @router.post("/query")
# async def execute_query(
#     request: QueryRequest,
#     factory: AdapterFactoryDep
# ):
#     adapter = factory.get_adapter(request.connection_url)
#     ...
```

### 5.2 服务层注入

```python
# src/services/query.py
from typing import Any

from adapters.base import DatabaseAdapter
from adapters.factory import AdapterFactory


class QueryService:
    """查询服务"""

    def __init__(self, adapter_factory: AdapterFactory):
        self._adapter_factory = adapter_factory

    def execute_query(
        self,
        connection_url: str,
        sql: str
    ) -> tuple[list[dict[str, Any]], list[tuple[str, str]], bool]:
        """
        执行查询

        Args:
            connection_url: 连接URL
            sql: SQL语句

        Returns:
            tuple: (结果行, 列信息, 是否截断)
        """
        # 获取适配器
        adapter = self._adapter_factory.get_adapter(connection_url)

        # 验证SQL
        is_valid, error = self._validate_sql(sql, adapter)
        if not is_valid:
            raise SqlValidationError(error)

        # 转换SQL
        transformed_sql = self._transform_sql(sql, adapter)

        # 执行查询
        engine = self._adapter_factory.create_engine(connection_url)
        with engine.connect() as conn:
            result = conn.execute(text(transformed_sql))
            columns = [(col[0], str(col[1])) for col in result.cursor.description]
            rows = [adapter.serialize_row(dict(row._mapping)) for row in result]

        return rows, columns, len(rows) >= 1000

    def _validate_sql(self, sql: str, adapter: DatabaseAdapter) -> tuple[bool, str]:
        """使用适配器的方言验证SQL"""
        # 使用 sqlglot 验证
        import sqlglot
        try:
            parsed = sqlglot.parse(sql, dialect=adapter.sqlglot_dialect)
            if not parsed:
                return False, "Failed to parse SQL"
            if parsed[0].sql_type != "SELECT":
                return False, "Only SELECT statements are allowed"
            return True, ""
        except Exception as e:
            return False, str(e)

    def _transform_sql(self, sql: str, adapter: DatabaseAdapter) -> str:
        """转换SQL"""
        # 移除尾部分号
        sql = sql.strip().rstrip(";")

        # 添加默认LIMIT（如果支持）
        if adapter.supports_limit_clause and "LIMIT" not in sql.upper():
            sql = f"{sql} LIMIT 1000"

        return sql


# 工厂函数
def create_query_service(
    adapter_factory: AdapterFactory = None
) -> QueryService:
    """创建查询服务"""
    if adapter_factory is None:
        from adapters.factory import adapter_factory
    return QueryService(adapter_factory)
```

---

## 6. 完整的初始化流程

```python
# src/adapters/__init__.py
"""
数据库适配器模块

使用方式:
    from adapters import adapter_registry, adapter_factory

    # 获取适配器
    adapter = adapter_registry.get_adapter("mysql://...")

    # 或使用工厂
    adapter = adapter_factory.get_adapter("mysql://...")
    engine = adapter_factory.create_engine("mysql://...")
"""

from .base import (
    DatabaseAdapter,
    PoolConfig,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
    QueryResult,
    ExtractionResult,
)
from .exceptions import (
    AdapterError,
    UnsupportedDatabaseError,
    AdapterNotFoundError,
    AdapterRegistrationError,
    MetadataExtractionError,
    ValueSerializationError,
)
from .registry import AdapterRegistry, adapter_registry
from .factory import AdapterFactory, adapter_factory
from .discovery import discover_adapters, auto_register

# 导入具体适配器（触发注册）
from .mysql import MySQLAdapter
from .sqlite import SQLiteAdapter
from .postgresql import PostgreSQLAdapter

# 注册适配器
adapter_registry.register(MySQLAdapter())
adapter_registry.register(SQLiteAdapter())
adapter_registry.register(PostgreSQLAdapter())

# 导出的公共API
__all__ = [
    # 基类和数据类
    "DatabaseAdapter",
    "PoolConfig",
    "SchemaInfo",
    "TableInfo",
    "ColumnInfo",
    "QueryResult",
    "ExtractionResult",
    # 异常
    "AdapterError",
    "UnsupportedDatabaseError",
    "AdapterNotFoundError",
    "AdapterRegistrationError",
    "MetadataExtractionError",
    "ValueSerializationError",
    # 注册表和工厂
    "AdapterRegistry",
    "adapter_registry",
    "AdapterFactory",
    "adapter_factory",
    # 具体适配器
    "MySQLAdapter",
    "SQLiteAdapter",
    "PostgreSQLAdapter",
    # 工具函数
    "discover_adapters",
    "auto_register",
]
```

---

## 7. 注册表使用示例

```python
# 示例1: 检查支持的数据库
from adapters import adapter_registry

print("Supported databases:", adapter_registry.list_supported_databases())
# Output: ['mysql', 'sqlite', 'postgresql']

print("Supported prefixes:", adapter_registry.list_all_prefixes())
# Output: ['mysql://', 'mysql+pymysql://', 'sqlite://', 'postgresql://', ...]


# 示例2: 获取适配器
from adapters import adapter_factory

# 通过URL获取
adapter = adapter_factory.get_adapter("mysql://user:pass@localhost/db")
print(f"Database type: {adapter.db_type}")  # mysql
print(f"Quote char: {adapter.identifier_quote_char}")  # `

# 通过类型获取
adapter = adapter_factory.get_adapter_by_type("postgresql")
print(f"Quote char: {adapter.identifier_quote_char}")  # "


# 示例3: 动态注册新适配器
from adapters import adapter_registry, DatabaseAdapter

class MongoDBAdapter(DatabaseAdapter):
    @property
    def db_type(self) -> str:
        return "mongodb"

    @property
    def connection_prefixes(self) -> list[str]:
        return ["mongodb://", "mongodb+srv://"]

    @property
    def sqlglot_dialect(self) -> str:
        return "mongo"  # 假设 sqlglot 支持

    # ... 实现其他方法

# 注册
adapter_registry.register(MongoDBAdapter())

# 现在可以使用
adapter = adapter_factory.get_adapter("mongodb://localhost:27017/db")
```


---

## 8. 类图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AdapterRegistry                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  - _instance: AdapterRegistry                                            │
│  - _lock: Lock                                                           │
│  - _adapters: dict[str, DatabaseAdapter]                                 │
│  - _type_index: dict[str, DatabaseAdapter]                               │
├─────────────────────────────────────────────────────────────────────────┤
│  + register(adapter: DatabaseAdapter) -> None                            │
│  + unregister(db_type: str) -> bool                                      │
│  + get_adapter(connection_url: str) -> DatabaseAdapter                   │
│  + get_adapter_by_type(db_type: str) -> DatabaseAdapter                  │
│  + list_supported_databases() -> list[str]                               │
│  + list_all_prefixes() -> list[str]                                      │
│  + is_supported(connection_url: str) -> bool                             │
│  + clear() -> None                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ uses
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          AdapterFactory                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  - _registry: AdapterRegistry                                            │
│  - _adapter_cache: dict[str, DatabaseAdapter]                            │
├─────────────────────────────────────────────────────────────────────────┤
│  + get_adapter(connection_url: str) -> DatabaseAdapter                   │
│  + get_adapter_by_type(db_type: str) -> DatabaseAdapter                  │
│  + create_engine(connection_url: str) -> Engine                          │
│  + create_inspector(engine: Engine) -> Inspector                         │
│  + validate_connection_url(url: str) -> tuple[bool, str | None]          │
│  + get_db_type(connection_url: str) -> str                               │
│  + clear_cache() -> None                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```
