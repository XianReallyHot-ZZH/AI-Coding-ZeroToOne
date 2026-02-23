# API Contracts: Database Query Tool

**Version**: 1.0.0
**Base URL**: `/api/v1`
**Date**: 2026-02-23

## Overview

This document defines the REST API contracts for the Database Query Tool. All responses use camelCase for JSON keys as per the project constitution.

## Common Response Formats

### Error Response

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created (for PUT /dbs/{name}) |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Database not found |
| 422 | Unprocessable Entity - SQL validation error |
| 500 | Internal Server Error |

---

## Endpoints

### 1. List All Databases

Get a list of all stored database connections.

```
GET /api/v1/dbs
```

**Response**: `200 OK`

```json
{
  "data": [
    {
      "name": "my-postgres",
      "connectionUrl": "postgresql://****:****@localhost:5432/mydb",
      "createdAt": "2026-02-23T10:00:00Z",
      "updatedAt": "2026-02-23T10:30:00Z",
      "tableCount": 15,
      "viewCount": 3
    }
  ]
}
```

---

### 2. Add Database Connection

Add a new database connection and extract its metadata.

```
PUT /api/v1/dbs/{name}
```

**Path Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | ✅ | Unique identifier for the connection (lowercase alphanumeric, underscore, hyphen) |

**Request Body**:

```json
{
  "url": "postgresql://postgres:postgres@localhost:5432/postgres"
}
```

**Request Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | ✅ | Database connection string |

**Response**: `201 Created`

```json
{
  "name": "my-postgres",
  "connectionUrl": "postgresql://****:****@localhost:5432/mydb",
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:00:00Z",
  "tableCount": 15,
  "viewCount": 3
}
```

**Error Responses**:
- `400`: Invalid connection string format
- `400`: Cannot connect to database (with specific error message)
- `409`: Database name already exists

---

### 3. Get Database Details

Get metadata for a specific database connection.

```
GET /api/v1/dbs/{name}
```

**Path Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | ✅ | Database connection name |

**Response**: `200 OK`

```json
{
  "name": "my-postgres",
  "connectionUrl": "postgresql://****:****@localhost:5432/mydb",
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:30:00Z",
  "tableCount": 15,
  "viewCount": 3,
  "tables": [
    {
      "schemaName": "public",
      "tableName": "users",
      "tableType": "table",
      "columns": [
        {
          "columnName": "id",
          "dataType": "integer",
          "isNullable": false,
          "isPrimaryKey": true,
          "defaultValue": "nextval('users_id_seq')",
          "position": 1
        },
        {
          "columnName": "email",
          "dataType": "varchar(255)",
          "isNullable": false,
          "isPrimaryKey": false,
          "defaultValue": null,
          "position": 2
        }
      ]
    }
  ]
}
```

**Error Responses**:
- `404`: Database not found

---

### 4. Execute SQL Query

Execute a SELECT statement on a connected database.

```
POST /api/v1/dbs/{name}/query
```

**Path Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | ✅ | Database connection name |

**Request Body**:

```json
{
  "sql": "SELECT * FROM users WHERE active = true LIMIT 10"
}
```

**Request Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sql | string | ✅ | SQL SELECT statement to execute |

**Response**: `200 OK`

```json
{
  "querySql": "SELECT * FROM users WHERE active = true LIMIT 10",
  "originalSql": "SELECT * FROM users WHERE active = true LIMIT 10",
  "rowCount": 10,
  "columns": [
    { "name": "id", "type": "integer" },
    { "name": "email", "type": "varchar" }
  ],
  "rows": [
    { "id": 1, "email": "user1@example.com" },
    { "id": 2, "email": "user2@example.com" }
  ],
  "truncated": false,
  "executionTimeMs": 45
}
```

**Notes**:
- If no LIMIT clause is provided, `LIMIT 1000` is automatically added
- `truncated` is `true` when results were cut off due to LIMIT
- `querySql` shows the actual SQL executed (may differ from `originalSql` if LIMIT was added)

**Error Responses**:
- `400`: SQL syntax error
- `422`: Non-SELECT statement (INSERT/UPDATE/DELETE/DDL rejected)
- `404`: Database not found
- `500`: Query execution error

---

### 5. Generate SQL from Natural Language

Convert a natural language prompt to SQL using LLM.

```
POST /api/v1/dbs/{name}/query/natural
```

**Path Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | ✅ | Database connection name |

**Request Body**:

```json
{
  "prompt": "查询所有活跃用户的邮箱和注册日期"
}
```

**Request Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | ✅ | Natural language description of desired query (max 2000 chars) |

**Response**: `200 OK`

```json
{
  "originalPrompt": "查询所有活跃用户的邮箱和注册日期",
  "generatedSql": "SELECT email, created_at FROM users WHERE active = true",
  "confidence": 0.85,
  "context": "Tables: users (id, email, created_at, active)"
}
```

**Notes**:
- The generated SQL is NOT automatically executed
- User should review and optionally modify before executing via `/query` endpoint
- `confidence` may not always be available (depends on LLM response)

**Error Responses**:
- `400`: Empty prompt or prompt too long
- `404`: Database not found
- `500`: LLM API error

---

### 6. Delete Database Connection

Remove a database connection and its cached metadata.

```
DELETE /api/v1/dbs/{name}
```

**Path Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | ✅ | Database connection name |

**Response**: `204 No Content`

**Error Responses**:
- `404`: Database not found

---

### 7. Refresh Database Metadata

Re-extract metadata from the connected database.

```
POST /api/v1/dbs/{name}/refresh
```

**Path Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | ✅ | Database connection name |

**Response**: `200 OK`

```json
{
  "name": "my-postgres",
  "connectionUrl": "postgresql://****:****@localhost:5432/mydb",
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T11:00:00Z",
  "tableCount": 16,
  "viewCount": 3
}
```

**Error Responses**:
- `404`: Database not found
- `400`: Cannot connect to database

---

## CORS Configuration

All endpoints support CORS with the following configuration:
- `Access-Control-Allow-Origin`: `*` (all origins)
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization`

## Rate Limiting

No rate limiting is implemented (internal tool, single user).
