"""Schema cache management."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from pg_mcp.config.models import CacheConfig
from pg_mcp.models.schema import DatabaseSchema

logger = logging.getLogger(__name__)


class SchemaCache:
    """Schema cache manager with memory and file persistence."""

    def __init__(self, config: CacheConfig):
        """
        Initialize schema cache.

        Args:
            config: Cache configuration.
        """
        self.config = config
        self.cache_path = Path(config.schema_path)
        self._memory_cache: dict[str, DatabaseSchema] = {}

        # Ensure cache directory exists
        self.cache_path.mkdir(parents=True, exist_ok=True)

    def _get_cache_file(self, database_name: str) -> Path:
        """
        Get cache file path for a database.

        Args:
            database_name: Database name.

        Returns:
            Path to cache file.
        """
        return self.cache_path / f"{database_name}.json"

    def get(self, database_name: str) -> Optional[DatabaseSchema]:
        """
        Get schema from cache.

        Args:
            database_name: Database name.

        Returns:
            DatabaseSchema if cached and not expired, None otherwise.
        """
        # Check memory cache first
        if database_name in self._memory_cache:
            cached = self._memory_cache[database_name]
            if not self._is_expired(cached):
                logger.debug(f"Memory cache hit for '{database_name}'")
                return cached

        # Check file cache
        cache_file = self._get_cache_file(database_name)
        if cache_file.exists():
            try:
                with open(cache_file, encoding="utf-8") as f:
                    data = json.load(f)
                schema = DatabaseSchema(**data)

                if not self._is_expired(schema):
                    self._memory_cache[database_name] = schema
                    logger.debug(f"File cache hit for '{database_name}'")
                    return schema
            except Exception as e:
                logger.warning(f"Failed to load cache for '{database_name}': {e}")

        return None

    def set(self, schema: DatabaseSchema) -> None:
        """
        Save schema to cache.

        Args:
            schema: DatabaseSchema to cache.
        """
        schema.cached_at = datetime.now()
        self._memory_cache[schema.database_name] = schema

        cache_file = self._get_cache_file(schema.database_name)
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                f.write(schema.model_dump_json(indent=2))
            logger.info(f"Cached schema for '{schema.database_name}'")
        except Exception as e:
            logger.error(f"Failed to write cache for '{schema.database_name}': {e}")

    def invalidate(self, database_name: str) -> None:
        """
        Invalidate cache for a database.

        Args:
            database_name: Database name.
        """
        if database_name in self._memory_cache:
            del self._memory_cache[database_name]

        cache_file = self._get_cache_file(database_name)
        if cache_file.exists():
            cache_file.unlink()

        logger.info(f"Invalidated cache for '{database_name}'")

    def invalidate_all(self) -> None:
        """Invalidate all caches."""
        self._memory_cache.clear()

        for cache_file in self.cache_path.glob("*.json"):
            cache_file.unlink()

        logger.info("Invalidated all caches")

    def _is_expired(self, schema: DatabaseSchema) -> bool:
        """
        Check if cached schema is expired.

        Args:
            schema: Cached schema.

        Returns:
            True if expired, False otherwise.
        """
        if self.config.schema_ttl == 0:
            return False  # Never expire

        expiry_time = schema.cached_at + timedelta(seconds=self.config.schema_ttl)
        return datetime.now() > expiry_time
