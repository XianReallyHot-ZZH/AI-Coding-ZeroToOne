"""Tests for Prompt templates."""

from __future__ import annotations

import pytest

from pg_mcp.llm.prompts import PromptBuilder
from pg_mcp.models.schema import (
    ColumnInfo,
    DatabaseSchema,
    ForeignKeyRef,
    IndexInfo,
    TableSchema,
    TableType,
)


class TestPromptBuilder:
    """Tests for PromptBuilder class."""

    @pytest.fixture
    def prompt_builder(self) -> PromptBuilder:
        """Create prompt builder instance."""
        return PromptBuilder()

    @pytest.fixture
    def sample_schema(self) -> DatabaseSchema:
        """Create a sample database schema."""
        return DatabaseSchema(
            database_name="test_db",
            tables=[
                TableSchema(
                    schema_name="public",
                    name="users",
                    type=TableType.TABLE,
                    comment="User accounts",
                    columns=[
                        ColumnInfo(
                            name="id",
                            type="integer",
                            nullable=False,
                            is_primary_key=True,
                            comment="Primary key",
                        ),
                        ColumnInfo(
                            name="name",
                            type="varchar(100)",
                            nullable=False,
                        ),
                        ColumnInfo(
                            name="email",
                            type="varchar(255)",
                            nullable=False,
                        ),
                        ColumnInfo(
                            name="department_id",
                            type="integer",
                            nullable=True,
                            is_foreign_key=True,
                            foreign_key_ref=ForeignKeyRef(
                                schema_name="public",
                                table="departments",
                                column="id",
                            ),
                        ),
                    ],
                    indexes=[
                        IndexInfo(
                            name="users_pkey",
                            columns=["id"],
                            is_primary=True,
                        ),
                        IndexInfo(
                            name="users_email_idx",
                            columns=["email"],
                            is_unique=True,
                        ),
                    ],
                ),
                TableSchema(
                    schema_name="public",
                    name="departments",
                    type=TableType.TABLE,
                    columns=[
                        ColumnInfo(
                            name="id",
                            type="integer",
                            nullable=False,
                            is_primary_key=True,
                        ),
                        ColumnInfo(
                            name="name",
                            type="varchar(50)",
                            nullable=False,
                        ),
                    ],
                ),
                TableSchema(
                    schema_name="public",
                    name="active_users",
                    type=TableType.VIEW,
                    comment="Active user accounts",
                    columns=[
                        ColumnInfo(
                            name="id",
                            type="integer",
                            nullable=False,
                        ),
                        ColumnInfo(
                            name="name",
                            type="varchar(100)",
                            nullable=False,
                        ),
                    ],
                ),
            ],
        )

    # === Template tests ===

    def test_sql_generation_template_exists(self, prompt_builder: PromptBuilder) -> None:
        """Test SQL generation template is defined."""
        assert hasattr(prompt_builder, "SQL_GENERATION_TEMPLATE")
        assert "SELECT" in prompt_builder.SQL_GENERATION_TEMPLATE
        assert "{schema_description}" in prompt_builder.SQL_GENERATION_TEMPLATE
        assert "{question}" in prompt_builder.SQL_GENERATION_TEMPLATE

    def test_result_validation_template_exists(self, prompt_builder: PromptBuilder) -> None:
        """Test result validation template is defined."""
        assert hasattr(prompt_builder, "RESULT_VALIDATION_TEMPLATE")
        assert "{question}" in prompt_builder.RESULT_VALIDATION_TEMPLATE
        assert "{sql}" in prompt_builder.RESULT_VALIDATION_TEMPLATE
        assert "{results_preview}" in prompt_builder.RESULT_VALIDATION_TEMPLATE

    # === build_schema_description tests ===

    def test_build_schema_description(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test building schema description."""
        result = prompt_builder.build_schema_description(sample_schema)

        assert "test_db" in result
        assert "public.users" in result
        assert "public.departments" in result
        assert "id: integer" in result
        assert "PK" in result
        assert "FK -> public.departments.id" in result
        assert "User accounts" in result

    def test_build_schema_description_with_filter(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test building schema description with table filter."""
        result = prompt_builder.build_schema_description(
            sample_schema,
            table_filter=["users"],
        )

        assert "public.users" in result
        # The departments table section should not appear (as a separate table)
        # Note: FK references to departments may still appear in users table description
        assert "### public.departments" not in result

    def test_build_schema_description_filter_case_insensitive(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test table filter is case insensitive."""
        result = prompt_builder.build_schema_description(
            sample_schema,
            table_filter=["USERS", "DEPARTMENTS"],
        )

        assert "public.users" in result
        assert "public.departments" in result
        assert "active_users" not in result

    def test_build_schema_description_includes_view(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test schema description includes views."""
        result = prompt_builder.build_schema_description(sample_schema)

        assert "active_users" in result
        assert "Type: view" in result

    def test_build_schema_description_includes_indexes(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test schema description includes index information."""
        result = prompt_builder.build_schema_description(sample_schema)

        assert "Indexes:" in result
        assert "users_pkey" in result
        assert "users_email_idx" in result
        assert "UNIQUE" in result

    def test_build_schema_description_empty_tables(self, prompt_builder: PromptBuilder) -> None:
        """Test schema description with no tables."""
        schema = DatabaseSchema(database_name="empty_db", tables=[])
        result = prompt_builder.build_schema_description(schema)

        assert "empty_db" in result

    # === build_sql_generation_prompt tests ===

    def test_build_sql_generation_prompt(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test building SQL generation prompt."""
        result = prompt_builder.build_sql_generation_prompt(
            schema=sample_schema,
            question="Find all users in engineering",
        )

        assert "test_db" in result
        assert "Find all users in engineering" in result
        assert "Only generate SELECT queries" in result

    def test_build_sql_generation_prompt_with_filter(
        self,
        prompt_builder: PromptBuilder,
        sample_schema: DatabaseSchema,
    ) -> None:
        """Test SQL generation prompt with table filter."""
        result = prompt_builder.build_sql_generation_prompt(
            schema=sample_schema,
            question="Count users",
            table_filter=["users"],
        )

        assert "public.users" in result
        # The departments table section should not appear (as a separate table)
        # Note: FK references to departments may still appear in users table description
        assert "### public.departments" not in result

    # === build_validation_prompt tests ===

    def test_build_validation_prompt(self, prompt_builder: PromptBuilder) -> None:
        """Test building validation prompt."""
        result = prompt_builder.build_validation_prompt(
            question="How many users are there?",
            sql="SELECT COUNT(*) FROM users",
            results_preview='[{"count": 42}]',
        )

        assert "How many users are there?" in result
        assert "SELECT COUNT(*) FROM users" in result
        assert '{"count": 42}' in result

    def test_build_validation_prompt_structure(self, prompt_builder: PromptBuilder) -> None:
        """Test validation prompt has required sections."""
        result = prompt_builder.build_validation_prompt(
            question="Test question",
            sql="SELECT 1",
            results_preview="No results",
        )

        assert "Original Question" in result
        assert "Generated SQL" in result
        assert "Query Results Preview" in result
        assert "Task" in result

    # === _format_table tests ===

    def test_format_table_basic(self, prompt_builder: PromptBuilder) -> None:
        """Test basic table formatting."""
        table = TableSchema(
            schema_name="public",
            name="test_table",
            type=TableType.TABLE,
            columns=[
                ColumnInfo(name="id", type="integer", nullable=False),
            ],
        )

        result = prompt_builder._format_table(table)

        assert "public.test_table" in result
        assert "Type: table" in result
        assert "id: integer" in result

    def test_format_table_with_comment(self, prompt_builder: PromptBuilder) -> None:
        """Test table formatting with comment."""
        table = TableSchema(
            schema_name="public",
            name="users",
            type=TableType.TABLE,
            comment="User information table",
            columns=[],
        )

        result = prompt_builder._format_table(table)

        assert "User information table" in result

    def test_format_table_with_primary_key(self, prompt_builder: PromptBuilder) -> None:
        """Test table formatting with primary key."""
        table = TableSchema(
            schema_name="public",
            name="items",
            type=TableType.TABLE,
            columns=[
                ColumnInfo(name="id", type="serial", nullable=False, is_primary_key=True),
            ],
        )

        result = prompt_builder._format_table(table)

        # PK flag should be present (may also include NOT NULL since nullable=False)
        assert "PK" in result

    def test_format_table_with_foreign_key(self, prompt_builder: PromptBuilder) -> None:
        """Test table formatting with foreign key."""
        table = TableSchema(
            schema_name="public",
            name="orders",
            type=TableType.TABLE,
            columns=[
                ColumnInfo(
                    name="user_id",
                    type="integer",
                    nullable=True,
                    is_foreign_key=True,
                    foreign_key_ref=ForeignKeyRef(
                        schema_name="public",
                        table="users",
                        column="id",
                    ),
                ),
            ],
        )

        result = prompt_builder._format_table(table)

        assert "FK -> public.users.id" in result

    def test_format_table_with_not_null(self, prompt_builder: PromptBuilder) -> None:
        """Test table formatting with NOT NULL constraint."""
        table = TableSchema(
            schema_name="public",
            name="products",
            type=TableType.TABLE,
            columns=[
                ColumnInfo(name="name", type="varchar(100)", nullable=False),
            ],
        )

        result = prompt_builder._format_table(table)

        assert "[NOT NULL]" in result

    def test_format_table_with_view_type(self, prompt_builder: PromptBuilder) -> None:
        """Test table formatting for view."""
        table = TableSchema(
            schema_name="public",
            name="active_users",
            type=TableType.VIEW,
            columns=[
                ColumnInfo(name="id", type="integer"),
            ],
        )

        result = prompt_builder._format_table(table)

        assert "Type: view" in result

    def test_format_table_with_materialized_view(self, prompt_builder: PromptBuilder) -> None:
        """Test table formatting for materialized view."""
        table = TableSchema(
            schema_name="public",
            name="summary_stats",
            type=TableType.MATERIALIZED_VIEW,
            columns=[],
        )

        result = prompt_builder._format_table(table)

        assert "Type: materialized_view" in result
