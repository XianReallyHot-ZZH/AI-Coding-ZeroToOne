"""Tests for Schema cache management."""

from __future__ import annotations

import json
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

import pytest

from pg_mcp.config.models import CacheConfig
from pg_mcp.models.schema import ColumnInfo, DatabaseSchema, TableSchema
from pg_mcp.database.cache import SchemaCache


class TestSchemaCache:
    """Tests for SchemaCache class."""

    @pytest.fixture
    def temp_cache_dir(self, tmp_path: Path) -> Path:
        """Create a temporary cache directory."""
        cache_dir = tmp_path / "cache"
        cache_dir.mkdir()
        return cache_dir

    @pytest.fixture
    def cache_config(self, temp_cache_dir: Path) -> CacheConfig:
        """Create cache configuration."""
        return CacheConfig(
            schema_ttl=3600,
            schema_path=str(temp_cache_dir),
        )

    @pytest.fixture
    def sample_schema(self) -> DatabaseSchema:
        """Create a sample database schema."""
        return DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    name="users",
                    columns=[
                        ColumnInfo(name="id", type="integer"),
                        ColumnInfo(name="name", type="varchar(100)"),
                    ],
                )
            ],
        )

    def test_cache_initialization(self, cache_config: CacheConfig, temp_cache_dir: Path) -> None:
        """Test cache initialization creates directory."""
        # Remove the directory to test creation
        new_path = temp_cache_dir.parent / "new_cache"
        config = CacheConfig(schema_ttl=3600, schema_path=str(new_path))

        cache = SchemaCache(config)

        assert new_path.exists()
        assert cache.cache_path == new_path

    def test_set_and_get_from_memory(
        self,
        cache_config: CacheConfig,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test setting and getting from memory cache."""
        cache = SchemaCache(cache_config)

        # Set cache
        cache.set(sample_schema)

        # Get from memory cache
        result = cache.get("test_db")

        assert result is not None
        assert result.database_name == "test_db"
        assert len(result.tables) == 1

    def test_cache_persists_to_file(
        self,
        cache_config: CacheConfig,
        sample_schema: DatabaseSchema,
        temp_cache_dir: Path,
    ) -> None:
        """Test that cache is persisted to file."""
        cache = SchemaCache(cache_config)

        # Set cache
        cache.set(sample_schema)

        # Check file exists
        cache_file = temp_cache_dir / "test_db.json"
        assert cache_file.exists()

        # Verify file content
        with open(cache_file, encoding="utf-8") as f:
            data = json.load(f)
        assert data["database_name"] == "test_db"

    def test_get_from_file_cache(
        self,
        cache_config: CacheConfig,
        sample_schema: DatabaseSchema,
        temp_cache_dir: Path,
    ) -> None:
        """Test getting from file cache when memory cache is empty."""
        cache = SchemaCache(cache_config)

        # Set cache (persists to file)
        cache.set(sample_schema)

        # Clear memory cache
        cache._memory_cache.clear()

        # Get should load from file
        result = cache.get("test_db")

        assert result is not None
        assert result.database_name == "test_db"

    def test_get_returns_none_for_missing(self, cache_config: CacheConfig) -> None:
        """Test that get returns None for missing cache."""
        cache = SchemaCache(cache_config)

        result = cache.get("nonexistent")

        assert result is None

    def test_invalidate_clears_memory_and_file(
        self,
        cache_config: CacheConfig,
        sample_schema: DatabaseSchema,
        temp_cache_dir: Path,
    ) -> None:
        """Test that invalidate clears both memory and file cache."""
        cache = SchemaCache(cache_config)

        # Set cache
        cache.set(sample_schema)

        # Verify it's cached
        assert cache.get("test_db") is not None
        assert (temp_cache_dir / "test_db.json").exists()

        # Invalidate
        cache.invalidate("test_db")

        # Verify it's cleared
        assert cache.get("test_db") is None
        assert not (temp_cache_dir / "test_db.json").exists()

    def test_invalidate_all(
        self,
        cache_config: CacheConfig,
        temp_cache_dir: Path,
    ) -> None:
        """Test invalidate_all clears all caches."""
        cache = SchemaCache(cache_config)

        # Set multiple caches
        schema1 = DatabaseSchema(database_name="db1")
        schema2 = DatabaseSchema(database_name="db2")
        cache.set(schema1)
        cache.set(schema2)

        # Verify they exist
        assert cache.get("db1") is not None
        assert cache.get("db2") is not None

        # Invalidate all
        cache.invalidate_all()

        # Verify all cleared
        assert cache.get("db1") is None
        assert cache.get("db2") is None
        assert len(list(temp_cache_dir.glob("*.json"))) == 0

    def test_ttl_not_expired(self, cache_config: CacheConfig, sample_schema: DatabaseSchema) -> None:
        """Test that cache is returned when TTL has not expired."""
        cache = SchemaCache(cache_config)

        # Set cache with recent timestamp
        sample_schema.cached_at = datetime.now()
        cache.set(sample_schema)

        result = cache.get("test_db")

        assert result is not None

    def test_ttl_expired(self, cache_config: CacheConfig, sample_schema: DatabaseSchema) -> None:
        """Test that cache returns None when TTL has expired."""
        # Create config with short TTL
        config = CacheConfig(schema_ttl=1, schema_path=cache_config.schema_path)
        cache = SchemaCache(config)

        # Set cache with old timestamp
        sample_schema.cached_at = datetime.now() - timedelta(seconds=10)
        cache._memory_cache["test_db"] = sample_schema

        result = cache.get("test_db")

        assert result is None

    def test_never_expire_with_zero_ttl(
        self,
        cache_config: CacheConfig,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test that cache never expires when TTL is 0."""
        # Create config with TTL = 0 (never expire)
        config = CacheConfig(schema_ttl=0, schema_path=cache_config.schema_path)
        cache = SchemaCache(config)

        # Set cache with very old timestamp
        sample_schema.cached_at = datetime.now() - timedelta(days=365)
        cache._memory_cache["test_db"] = sample_schema

        result = cache.get("test_db")

        assert result is not None

    def test_corrupted_cache_file(
        self,
        cache_config: CacheConfig,
        temp_cache_dir: Path,
    ) -> None:
        """Test that corrupted cache file is handled gracefully."""
        cache = SchemaCache(cache_config)

        # Create corrupted cache file
        cache_file = temp_cache_dir / "test_db.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            f.write("invalid json {{{")

        # Get should return None and log warning
        result = cache.get("test_db")

        assert result is None
