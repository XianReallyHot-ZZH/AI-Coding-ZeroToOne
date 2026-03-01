from openai import OpenAI

from src.config import settings
from src.db.repository import ColumnMetadataRepository, TableMetadataRepository
from src.services.connection import get_db_type

client = OpenAI(
    api_key=settings.deepseek_api_key,
    base_url=settings.deepseek_base_url,
)


def get_system_prompt(db_type: str = "postgresql") -> str:
    """Generate database-type aware system prompt."""
    db_specific_rules = {
        "mysql": """
MySQL-specific rules:
- Use backticks (`) for identifier quoting if needed
- Use LIMIT n syntax (same as PostgreSQL)
- String literals use single quotes
- Boolean values: TRUE/FALSE or 1/0
- Date/time functions: NOW(), CURDATE(), DATE_FORMAT()
- Use IFNULL() instead of COALESCE for single argument""",
        "postgresql": """
PostgreSQL-specific rules:
- Use double quotes (") for identifier quoting if needed
- Use LIMIT n syntax
- String literals use single quotes
- Boolean values: true/false
- Date/time functions: NOW(), CURRENT_DATE, TO_CHAR()
- Use COALESCE() for null handling""",
        "sqlite": """
SQLite-specific rules:
- No identifier quoting needed in most cases
- Use LIMIT n syntax
- String literals use single quotes
- No native boolean type (use 0/1)
- Date/time functions: datetime(), date(), strftime()""",
    }

    db_rules = db_specific_rules.get(db_type, db_specific_rules["postgresql"])

    return f"""You are an expert SQL assistant. Given a database schema and a natural language question, generate a valid SQL SELECT query.

Rules:
1. Only generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DDL statements.
2. Use proper table and column names from the provided schema.
3. Include appropriate JOINs when the question requires data from multiple tables.
4. Add WHERE clauses to filter data based on the question.
5. Use LIMIT when appropriate to avoid returning too many rows.
6. Return the SQL query and a brief explanation of what the query does.

Database type: {db_type.upper()}
{db_rules}

Respond in the following JSON format:
{{
  "sql": "your SQL query here",
  "explanation": "brief explanation of the query"
}}"""


class NlQueryService:
    @classmethod
    def build_schema_context(
        cls,
        db_name: str,
        table_repo: TableMetadataRepository,
        column_repo: ColumnMetadataRepository,
    ) -> str:
        tables = table_repo.get_by_database(db_name)

        if not tables:
            return "No tables found in the database."

        schema_parts = []
        for table in tables:
            columns = column_repo.get_by_table(table.id)
            column_defs = []
            for col in columns:
                constraints = []
                if col.is_primary_key:
                    constraints.append("PRIMARY KEY")
                if not col.is_nullable:
                    constraints.append("NOT NULL")
                if col.default_value:
                    constraints.append(f"DEFAULT {col.default_value}")

                constraint_str = f" {', '.join(constraints)}" if constraints else ""
                column_defs.append(f"  {col.column_name} {col.data_type}{constraint_str}")

            column_str = ",\n".join(column_defs)
            schema_parts.append(
                f"Table: {table.schema_name}.{table.table_name} ({table.table_type})\n"
                f"Columns:\n{column_str}"
            )

        return "\n\n".join(schema_parts)

    @classmethod
    def generate_sql(
        cls,
        question: str,
        schema_context: str,
        connection_url: str | None = None,
        db_type: str | None = None,
    ) -> tuple[str, str]:
        """Generate SQL from natural language question.

        Args:
            question: Natural language question
            schema_context: Database schema context
            connection_url: Database connection URL (used to detect db_type)
            db_type: Database type override (if provided, skips URL detection)

        Returns:
            Tuple of (sql, explanation)
        """
        if not settings.deepseek_api_key or settings.deepseek_api_key == "your-deepseek-api-key-here":
            raise ValueError("Deepseek API key is not configured. Please set DEEPSEEK_API_KEY in .env file.")

        # Detect database type from connection URL or use provided type
        if db_type is None and connection_url:
            db_type = get_db_type(connection_url)
        elif db_type is None:
            db_type = "postgresql"  # Default fallback

        system_prompt = get_system_prompt(db_type)

        user_prompt = f"""Database Schema:
{schema_context}

Question: {question}

Generate a SQL query to answer this question."""

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from Deepseek")

        import json

        result = json.loads(content)

        sql = result.get("sql", "")
        explanation = result.get("explanation", "")

        return sql, explanation
