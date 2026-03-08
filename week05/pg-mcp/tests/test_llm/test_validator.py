"""Tests for Result validator."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from pg_mcp.config.models import LLMConfig
from pg_mcp.llm.client import DeepSeekClient, LLMResponse
from pg_mcp.llm.prompts import PromptBuilder
from pg_mcp.llm.validator import ResultValidator


class TestResultValidator:
    """Tests for ResultValidator class."""

    @pytest.fixture
    def llm_config(self) -> LLMConfig:
        """Create LLM configuration."""
        return LLMConfig(
            provider="deepseek",
            model="deepseek-chat",
            api_key="test-api-key",
        )

    @pytest.fixture
    def client(self, llm_config: LLMConfig) -> DeepSeekClient:
        """Create DeepSeek client instance."""
        return DeepSeekClient(llm_config)

    @pytest.fixture
    def prompt_builder(self) -> PromptBuilder:
        """Create prompt builder instance."""
        return PromptBuilder()

    @pytest.fixture
    def validator(self, client: DeepSeekClient, prompt_builder: PromptBuilder) -> ResultValidator:
        """Create result validator instance."""
        return ResultValidator(client, prompt_builder)

    def test_initialization(
        self,
        client: DeepSeekClient,
        prompt_builder: PromptBuilder,
    ) -> None:
        """Test validator initialization."""
        validator = ResultValidator(client, prompt_builder)

        assert validator._client is client
        assert validator._prompt_builder is prompt_builder

    @pytest.mark.asyncio
    async def test_validate_success(
        self,
        validator: ResultValidator,
        client: DeepSeekClient,
    ) -> None:
        """Test successful validation."""
        mock_response = LLMResponse(
            content="The results correctly answer the question with 42 total users.",
            model="deepseek-chat",
            usage={},
        )

        with pytest.MonkeyPatch.context() as m:
            mock_generate = AsyncMock(return_value=mock_response)
            m.setattr(client, "generate", mock_generate)

            result = await validator.validate(
                question="How many users?",
                sql="SELECT COUNT(*) FROM users",
                results=[{"count": 42}],
            )

            assert "correctly" in result.lower() or "42" in result
            mock_generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_with_empty_results(
        self,
        validator: ResultValidator,
        client: DeepSeekClient,
    ) -> None:
        """Test validation with empty results."""
        mock_response = LLMResponse(
            content="No results were returned, which may indicate no matching data.",
            model="deepseek-chat",
            usage={},
        )

        with pytest.MonkeyPatch.context() as m:
            mock_generate = AsyncMock(return_value=mock_response)
            m.setattr(client, "generate", mock_generate)

            result = await validator.validate(
                question="Find inactive users",
                sql="SELECT * FROM users WHERE active = false",
                results=[],
            )

            assert result is not None
            mock_generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_with_many_results(
        self,
        validator: ResultValidator,
        client: DeepSeekClient,
    ) -> None:
        """Test validation with many results (should be truncated in preview)."""
        mock_response = LLMResponse(
            content="Results look correct.",
            model="deepseek-chat",
            usage={},
        )

        # Create 20 results
        results = [{"id": i, "name": f"User {i}"} for i in range(20)]

        with pytest.MonkeyPatch.context() as m:
            mock_generate = AsyncMock(return_value=mock_response)
            m.setattr(client, "generate", mock_generate)

            result = await validator.validate(
                question="List all users",
                sql="SELECT * FROM users",
                results=results,
            )

            assert result is not None

            # Check that generate was called with truncated preview
            call_args = mock_generate.call_args[0][0]
            assert "10 more rows" in call_args


class TestBuildPreview:
    """Tests for _build_preview method."""

    @pytest.fixture
    def validator(self) -> ResultValidator:
        """Create a minimal validator for testing."""
        client = MagicMock(spec=DeepSeekClient)
        prompt_builder = PromptBuilder()
        return ResultValidator(client, prompt_builder)

    def test_build_preview_empty_results(self, validator: ResultValidator) -> None:
        """Test building preview with empty results."""
        result = validator._build_preview([])

        assert result == "No results returned."

    def test_build_preview_single_result(self, validator: ResultValidator) -> None:
        """Test building preview with single result."""
        results = [{"id": 1, "name": "Alice"}]

        result = validator._build_preview(results)

        assert '"id": 1' in result
        assert '"name": "Alice"' in result

    def test_build_preview_multiple_results(self, validator: ResultValidator) -> None:
        """Test building preview with multiple results."""
        results = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
            {"id": 3, "name": "Charlie"},
        ]

        result = validator._build_preview(results)

        assert "Alice" in result
        assert "Bob" in result
        assert "Charlie" in result

    def test_build_preview_truncation(self, validator: ResultValidator) -> None:
        """Test preview truncation with many results."""
        # Create 15 results
        results = [{"id": i, "name": f"User {i}"} for i in range(15)]

        result = validator._build_preview(results, max_rows=10)

        # Should include truncation message
        assert "5 more rows" in result

    def test_build_preview_custom_max_rows(self, validator: ResultValidator) -> None:
        """Test preview with custom max_rows."""
        results = [{"id": i} for i in range(10)]

        result = validator._build_preview(results, max_rows=3)

        assert "7 more rows" in result

    def test_build_preview_exactly_max_rows(self, validator: ResultValidator) -> None:
        """Test preview with exactly max_rows results."""
        results = [{"id": i} for i in range(10)]

        result = validator._build_preview(results, max_rows=10)

        # No truncation message
        assert "more rows" not in result

    def test_build_preview_with_complex_types(self, validator: ResultValidator) -> None:
        """Test preview with complex data types."""
        from datetime import datetime

        results = [
            {
                "id": 1,
                "created_at": datetime(2024, 1, 15, 10, 30, 0),
                "data": {"key": "value"},
            }
        ]

        result = validator._build_preview(results)

        # Should serialize without error
        assert '"id": 1' in result

    def test_build_preview_with_none_values(self, validator: ResultValidator) -> None:
        """Test preview with None values."""
        results = [
            {"id": 1, "name": "Alice", "email": None},
            {"id": 2, "name": None, "email": "bob@example.com"},
        ]

        result = validator._build_preview(results)

        assert "null" in result.lower() or "None" in result

    def test_build_preview_json_format(self, validator: ResultValidator) -> None:
        """Test preview is valid JSON format."""
        results = [{"id": 1, "name": "Test"}]

        result = validator._build_preview(results)

        import json

        # Should be able to parse the JSON part
        # Find the JSON in the result (before any truncation message)
        json_part = result.split("\n\n...")[0]
        parsed = json.loads(json_part)
        assert parsed[0]["id"] == 1
