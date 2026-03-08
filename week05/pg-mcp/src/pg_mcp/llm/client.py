"""DeepSeek LLM client for SQL generation."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Optional

import httpx
from pydantic import BaseModel

from pg_mcp.config.models import LLMConfig

logger = logging.getLogger(__name__)


class LLMResponse(BaseModel):
    """LLM API response."""

    content: str
    model: str
    usage: dict


class DeepSeekClient:
    """DeepSeek API client with retry support."""

    def __init__(self, config: LLMConfig):
        """
        Initialize DeepSeek client.

        Args:
            config: LLM configuration.
        """
        self._config = config
        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(config.timeout),
        )

    async def generate(self, prompt: str) -> LLMResponse:
        """
        Generate response from LLM.

        Args:
            prompt: Input prompt.

        Returns:
            LLMResponse with generated content.

        Raises:
            httpx.HTTPError: If API call fails after retries.
        """
        payload = {
            "model": self._config.model,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,  # Low temperature for more deterministic SQL
        }

        last_error: Optional[Exception] = None

        for attempt in range(self._config.max_retries + 1):
            try:
                response = await self._client.post(
                    "/chat/completions",
                    json=payload,
                )
                response.raise_for_status()

                data = response.json()
                content = data["choices"][0]["message"]["content"]

                return LLMResponse(
                    content=content,
                    model=data.get("model", self._config.model),
                    usage=data.get("usage", {}),
                )

            except httpx.HTTPStatusError as e:
                last_error = e
                logger.warning(f"API call failed (attempt {attempt + 1}): {e}")

                if attempt < self._config.max_retries:
                    # Exponential backoff
                    delay = (2**attempt) * 1.0
                    await asyncio.sleep(delay)

            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error during API call: {e}")
                break

        raise RuntimeError(f"Failed to generate response after {self._config.max_retries + 1} attempts: {last_error}")

    async def generate_sql(self, prompt: str) -> str:
        """
        Generate SQL query from prompt.

        Args:
            prompt: SQL generation prompt.

        Returns:
            Extracted SQL query.

        Raises:
            ValueError: If no valid SQL is found.
        """
        response = await self.generate(prompt)
        sql = self._extract_sql(response.content)

        if not sql:
            raise ValueError("Failed to extract valid SQL from LLM response")

        return sql

    def _extract_sql(self, content: str) -> Optional[str]:
        """
        Extract SQL query from LLM response.

        Args:
            content: LLM response content.

        Returns:
            Extracted SQL query or None.
        """
        # Try to extract from code blocks first
        code_block_pattern = r"```(?:sql)?\s*\n?(.*?)\n?```"
        matches = re.findall(code_block_pattern, content, re.DOTALL | re.IGNORECASE)

        if matches:
            # Return the first SQL code block
            return matches[0].strip()

        # Try to find SELECT statement directly
        select_pattern = r"(SELECT\s+.*?(?:;|$))"
        matches = re.findall(select_pattern, content, re.DOTALL | re.IGNORECASE)

        if matches:
            return matches[0].strip().rstrip(";")

        # If content looks like SQL, return it directly
        stripped = content.strip()
        if stripped.upper().startswith("SELECT"):
            return stripped

        return None

    async def validate_result(
        self,
        question: str,
        sql: str,
        results_preview: str,
        validation_prompt: str,
    ) -> str:
        """
        Validate query results using LLM.

        Args:
            question: Original user question.
            sql: Generated SQL query.
            results_preview: Preview of query results.
            validation_prompt: Validation prompt template.

        Returns:
            Validation message.
        """
        prompt = validation_prompt.format(
            question=question,
            sql=sql,
            results_preview=results_preview,
        )

        response = await self.generate(prompt)
        return response.content

    async def close(self) -> None:
        """Close HTTP client."""
        await self._client.aclose()
