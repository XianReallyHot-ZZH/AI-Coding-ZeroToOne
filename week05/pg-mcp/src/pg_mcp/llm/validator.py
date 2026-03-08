"""Result validator using LLM."""

from __future__ import annotations

import json
import logging
from typing import Any

from pg_mcp.llm.client import DeepSeekClient
from pg_mcp.llm.prompts import PromptBuilder

logger = logging.getLogger(__name__)


class ResultValidator:
    """Validates query results using LLM."""

    def __init__(self, client: DeepSeekClient, prompt_builder: PromptBuilder):
        """
        Initialize result validator.

        Args:
            client: DeepSeek client.
            prompt_builder: Prompt builder instance.
        """
        self._client = client
        self._prompt_builder = prompt_builder

    async def validate(
        self,
        question: str,
        sql: str,
        results: list[dict[str, Any]],
    ) -> str:
        """
        Validate query results.

        Args:
            question: Original user question.
            sql: Generated SQL query.
            results: Query results.

        Returns:
            Validation message.
        """
        preview = self._build_preview(results)
        prompt = self._prompt_builder.build_validation_prompt(
            question=question,
            sql=sql,
            results_preview=preview,
        )

        response = await self._client.generate(prompt)
        return response.content

    def _build_preview(
        self,
        results: list[dict[str, Any]],
        max_rows: int = 10,
    ) -> str:
        """
        Build a preview string of query results.

        Args:
            results: Query results.
            max_rows: Maximum rows to include in preview.

        Returns:
            Formatted preview string.
        """
        if not results:
            return "No results returned."

        preview_rows = results[:max_rows]
        preview = json.dumps(preview_rows, indent=2, default=str)

        if len(results) > max_rows:
            preview += f"\n\n... and {len(results) - max_rows} more rows"

        return preview
