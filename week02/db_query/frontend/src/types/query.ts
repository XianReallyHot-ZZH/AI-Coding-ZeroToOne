export interface QueryRequest {
  sql: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
}

export interface QueryResult {
  querySql: string;
  originalSql: string;
  rowCount: number;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  executionTimeMs: number;
}

export interface NaturalLanguageRequest {
  prompt: string;
}

export interface GeneratedQuery {
  originalPrompt: string;
  generatedSql: string;
  confidence: number | null;
  context: string | null;
}
