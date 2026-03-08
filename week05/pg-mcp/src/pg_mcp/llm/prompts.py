"""Prompt templates for SQL generation and validation."""

from __future__ import annotations

from typing import Optional

from pg_mcp.models.schema import DatabaseSchema, TableSchema


class PromptBuilder:
    """Builder for LLM prompts."""

    SQL_GENERATION_TEMPLATE = """You are an expert PostgreSQL database analyst. Your task is to generate a safe, efficient SQL query based on the user's natural language question.

## Database Schema

{schema_description}

## Important Rules

1. **Only generate SELECT queries** - Never generate INSERT, UPDATE, DELETE, DROP, or any modifying statements
2. **Use proper table aliases** - Make the query readable with meaningful aliases
3. **Add appropriate LIMIT** - Always include a reasonable LIMIT clause (default 100 rows)
4. **Handle NULL values** - Use COALESCE or IS NULL/IS NOT NULL appropriately
5. **Use JOINs efficiently** - Prefer explicit JOIN syntax over subqueries when possible
6. **Format the SQL** - Use proper indentation and line breaks for readability

## Response Format

Return ONLY the SQL query, no explanations or markdown formatting. The query should be executable directly.

## User Question

{question}
"""

    RESULT_VALIDATION_TEMPLATE = """You are a data analyst reviewing query results. Please validate if the query results correctly answer the user's question.

## Original Question

{question}

## Generated SQL

{sql}

## Query Results Preview

{results_preview}

## Task

Analyze the results and determine:
1. Do the results make sense given the question?
2. Are there any obvious errors or anomalies?
3. Is the data format appropriate?

Provide a brief assessment (2-3 sentences) of whether the results appear to correctly answer the question.
"""

    def __init__(self):
        """Initialize prompt builder."""
        pass

    def build_schema_description(
        self,
        schema: DatabaseSchema,
        table_filter: Optional[list[str]] = None,
    ) -> str:
        """
        Build human-readable schema description.

        Args:
            schema: Database schema.
            table_filter: Optional list of table names to include.

        Returns:
            Formatted schema description.
        """
        lines = [f"Database: {schema.database_name}\n"]

        for table in schema.tables:
            # Apply table filter
            if table_filter:
                table_names = [t.lower() for t in table_filter]
                if table.name.lower() not in table_names:
                    continue

            lines.append(self._format_table(table))

        return "\n".join(lines)

    def _format_table(self, table: TableSchema) -> str:
        """Format a single table description."""
        lines = [
            f"### {table.schema_name}.{table.name}",
            f"Type: {table.type.value}",
        ]

        if table.comment:
            lines.append(f"Description: {table.comment}")

        lines.append("\nColumns:")

        for col in table.columns:
            col_desc = f"  - {col.name}: {col.type}"
            flags = []

            if col.is_primary_key:
                flags.append("PK")
            if col.is_foreign_key and col.foreign_key_ref:
                flags.append(
                    f"FK -> {col.foreign_key_ref.schema_name}.{col.foreign_key_ref.table}.{col.foreign_key_ref.column}"
                )
            if not col.nullable:
                flags.append("NOT NULL")

            if flags:
                col_desc += f" [{', '.join(flags)}]"

            if col.comment:
                col_desc += f" # {col.comment}"

            lines.append(col_desc)

        if table.indexes:
            lines.append("\nIndexes:")
            for idx in table.indexes:
                idx_type = "PRIMARY" if idx.is_primary else ("UNIQUE" if idx.is_unique else "INDEX")
                lines.append(f"  - {idx.name} ({idx_type}): {', '.join(idx.columns)}")

        return "\n".join(lines) + "\n"

    def build_sql_generation_prompt(
        self,
        schema: DatabaseSchema,
        question: str,
        table_filter: Optional[list[str]] = None,
    ) -> str:
        """
        Build prompt for SQL generation.

        Args:
            schema: Database schema.
            question: User's natural language question.
            table_filter: Optional list of tables to focus on.

        Returns:
            Complete prompt string.
        """
        schema_desc = self.build_schema_description(schema, table_filter)

        return self.SQL_GENERATION_TEMPLATE.format(
            schema_description=schema_desc,
            question=question,
        )

    def build_validation_prompt(
        self,
        question: str,
        sql: str,
        results_preview: str,
    ) -> str:
        """
        Build prompt for result validation.

        Args:
            question: Original user question.
            sql: Generated SQL query.
            results_preview: Preview of query results.

        Returns:
            Complete prompt string.
        """
        return self.RESULT_VALIDATION_TEMPLATE.format(
            question=question,
            sql=sql,
            results_preview=results_preview,
        )
