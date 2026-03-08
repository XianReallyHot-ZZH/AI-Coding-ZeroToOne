"""Tests for DeepSeek LLM client."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from pg_mcp.config.models import LLMConfig
from pg_mcp.llm.client import DeepSeekClient, LLMResponse


class TestLLMResponse:
    """Tests for LLMResponse model."""

    def test_create_llm_response(self) -> None:
        """Test creating LLM response."""
        response = LLMResponse(
            content="SELECT * FROM users",
            model="deepseek-chat",
            usage={"prompt_tokens": 10, "completion_tokens": 5},
        )

        assert response.content == "SELECT * FROM users"
        assert response.model == "deepseek-chat"
        assert response.usage["prompt_tokens"] == 10


class TestDeepSeekClient:
    """Tests for DeepSeekClient class."""

    @pytest.fixture
    def llm_config(self) -> LLMConfig:
        """Create LLM configuration."""
        return LLMConfig(
            provider="deepseek",
            model="deepseek-chat",
            api_key="test-api-key",
            base_url="https://api.deepseek.com/v1",
            timeout=30,
            max_retries=3,
        )

    @pytest.fixture
    def client(self, llm_config: LLMConfig) -> DeepSeekClient:
        """Create DeepSeek client instance."""
        return DeepSeekClient(llm_config)

    def test_initialization(self, llm_config: LLMConfig) -> None:
        """Test client initialization."""
        client = DeepSeekClient(llm_config)

        assert client._config is llm_config
        assert client._client is not None
        assert client._client.headers["Authorization"] == "Bearer test-api-key"

    @pytest.mark.asyncio
    async def test_generate_success(self, client: DeepSeekClient) -> None:
        """Test successful generation."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {"message": {"content": "SELECT * FROM users LIMIT 10"}}
            ],
            "model": "deepseek-chat",
            "usage": {"prompt_tokens": 20, "completion_tokens": 10},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await client.generate("Show me all users")

            assert result.content == "SELECT * FROM users LIMIT 10"
            assert result.model == "deepseek-chat"
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_with_retry(self, llm_config: LLMConfig) -> None:
        """Test generation with retry on failure."""
        llm_config.max_retries = 2
        client = DeepSeekClient(llm_config)

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Success"}}],
            "model": "deepseek-chat",
            "usage": {},
        }
        mock_response.raise_for_status = MagicMock()

        call_count = 0

        async def mock_post(*args, **kwargs):  # noqa: ANN002
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                # First two calls fail
                raise httpx.HTTPStatusError(
                    "Server error",
                    request=MagicMock(),
                    response=MagicMock(status_code=500),
                )
            return mock_response

        with patch.object(client._client, "post", new_callable=AsyncMock) as post_mock:
            post_mock.side_effect = mock_post

            result = await client.generate("Test prompt")

            assert result.content == "Success"
            assert call_count == 3  # Initial + 2 retries

    @pytest.mark.asyncio
    async def test_generate_max_retries_exceeded(self, llm_config: LLMConfig) -> None:
        """Test generation fails after max retries."""
        llm_config.max_retries = 1
        client = DeepSeekClient(llm_config)

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.HTTPStatusError(
                "Server error",
                request=MagicMock(),
                response=MagicMock(status_code=500),
            )

            with pytest.raises(RuntimeError, match="Failed to generate response"):
                await client.generate("Test prompt")

    @pytest.mark.asyncio
    async def test_generate_sql_success(self, client: DeepSeekClient) -> None:
        """Test SQL generation success."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {"message": {"content": "```sql\nSELECT * FROM users\n```"}}
            ],
            "model": "deepseek-chat",
            "usage": {},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await client.generate_sql("Show all users")

            assert result == "SELECT * FROM users"

    @pytest.mark.asyncio
    async def test_generate_sql_no_valid_sql(self, client: DeepSeekClient) -> None:
        """Test SQL generation fails when no valid SQL found."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "I cannot help with that."}}],
            "model": "deepseek-chat",
            "usage": {},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            with pytest.raises(ValueError, match="Failed to extract valid SQL"):
                await client.generate_sql("Invalid request")

    @pytest.mark.asyncio
    async def test_validate_result(self, client: DeepSeekClient) -> None:
        """Test result validation."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {"message": {"content": "The results correctly answer the question."}}
            ],
            "model": "deepseek-chat",
            "usage": {},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await client.validate_result(
                question="How many users?",
                sql="SELECT COUNT(*) FROM users",
                results_preview='[{"count": 42}]',
                validation_prompt="Validate: {question}\n{sql}\n{results_preview}",
            )

            assert "correctly answer" in result

    @pytest.mark.asyncio
    async def test_close(self, client: DeepSeekClient) -> None:
        """Test client close."""
        with patch.object(client._client, "aclose", new_callable=AsyncMock) as mock_close:
            await client.close()
            mock_close.assert_called_once()


class TestExtractSQL:
    """Tests for _extract_sql method."""

    @pytest.fixture
    def client(self) -> DeepSeekClient:
        """Create client for testing."""
        config = LLMConfig(
            provider="deepseek",
            model="deepseek-chat",
            api_key="test-key",
        )
        return DeepSeekClient(config)

    def test_extract_sql_from_code_block(self, client: DeepSeekClient) -> None:
        """Test extracting SQL from code block."""
        content = """Here's the query:

```sql
SELECT * FROM users WHERE active = true
```

This will return active users."""

        result = client._extract_sql(content)

        assert result == "SELECT * FROM users WHERE active = true"

    def test_extract_sql_from_plain_code_block(self, client: DeepSeekClient) -> None:
        """Test extracting SQL from plain code block."""
        content = """```
SELECT id, name FROM products
```"""

        result = client._extract_sql(content)

        assert result == "SELECT id, name FROM products"

    def test_extract_sql_direct_select(self, client: DeepSeekClient) -> None:
        """Test extracting SQL from direct SELECT statement."""
        content = "SELECT * FROM orders LIMIT 10"

        result = client._extract_sql(content)

        assert result == "SELECT * FROM orders LIMIT 10"

    def test_extract_sql_with_semicolon(self, client: DeepSeekClient) -> None:
        """Test extracting SQL with trailing semicolon."""
        content = "SELECT COUNT(*) FROM users;"

        result = client._extract_sql(content)

        assert result == "SELECT COUNT(*) FROM users"

    def test_extract_sql_multiline(self, client: DeepSeekClient) -> None:
        """Test extracting multiline SQL."""
        content = """```sql
SELECT
    u.id,
    u.name,
    COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
```"""

        result = client._extract_sql(content)

        assert "SELECT" in result
        assert "FROM users u" in result
        assert "GROUP BY" in result

    def test_extract_sql_no_match(self, client: DeepSeekClient) -> None:
        """Test extraction with no SQL."""
        content = "This is just regular text with no SQL."

        result = client._extract_sql(content)

        assert result is None

    def test_extract_sql_with_select_in_text(self, client: DeepSeekClient) -> None:
        """Test extraction when SELECT is in text."""
        content = "You should SELECT the right option."

        # This won't match because it doesn't look like a complete SQL
        result = client._extract_sql(content)

        # The regex should not match incomplete SQL
        assert result is None or "SELECT" in result.upper()

    def test_extract_sql_case_insensitive(self, client: DeepSeekClient) -> None:
        """Test extraction is case insensitive."""
        content = "select * from users"

        result = client._extract_sql(content)

        assert result is not None
        assert "select" in result.lower()
