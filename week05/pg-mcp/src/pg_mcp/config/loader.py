"""Configuration loader for YAML-based configuration files."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import yaml

from pg_mcp.config.models import AppConfig

logger = logging.getLogger(__name__)


class ConfigLoader:
    """Configuration loader with multi-path support."""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize configuration loader.

        Args:
            config_path: Optional explicit path to configuration file.
                        If not provided, will search default paths.
        """
        self.config_path = config_path or self._find_config_file()
        self._config: Optional[AppConfig] = None

    def _find_config_file(self) -> str:
        """
        Find configuration file by searching default paths.

        Returns:
            Path to configuration file.

        Raises:
            FileNotFoundError: If no configuration file is found.
        """
        # Check environment variable first
        env_path = os.getenv("PG_MCP_CONFIG_PATH")
        if env_path:
            expanded = Path(env_path).expanduser()
            if expanded.exists():
                logger.info(f"Using config from environment: {expanded}")
                return str(expanded)
            raise FileNotFoundError(f"Config file from environment not found: {env_path}")

        # Default search paths in priority order
        search_paths = [
            "./pg-mcp-config.yaml",
            "./config/pg-mcp-config.yaml",
            "~/.pg-mcp/config.yaml",
        ]

        for path in search_paths:
            expanded = Path(path).expanduser()
            if expanded.exists():
                logger.info(f"Found config file: {expanded}")
                return str(expanded)

        raise FileNotFoundError(
            "Configuration file not found. "
            "Searched paths: " + ", ".join(search_paths) + ". "
            "Set PG_MCP_CONFIG_PATH environment variable or create a config file."
        )

    def load(self) -> AppConfig:
        """
        Load and validate configuration from file.

        Returns:
            Validated AppConfig instance.

        Raises:
            FileNotFoundError: If configuration file doesn't exist.
            ValueError: If configuration is invalid.
        """
        if self._config is not None:
            return self._config

        config_file = Path(self.config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")

        try:
            with open(config_file, encoding="utf-8") as f:
                raw_config = yaml.safe_load(f)

            if raw_config is None:
                raise ValueError(f"Configuration file is empty: {self.config_path}")

            self._config = AppConfig(**raw_config)
            logger.info(f"Loaded configuration with {len(self._config.databases)} database(s)")
            return self._config

        except yaml.YAMLError as e:
            raise ValueError(f"Failed to parse YAML configuration: {e}") from e

    def reload(self) -> AppConfig:
        """
        Reload configuration from file.

        Returns:
            Freshly loaded AppConfig instance.
        """
        self._config = None
        logger.info("Reloading configuration...")
        return self.load()

    @property
    def config(self) -> AppConfig:
        """
        Get configuration (lazy loading).

        Returns:
            AppConfig instance.
        """
        if self._config is None:
            self._config = self.load()
        return self._config
