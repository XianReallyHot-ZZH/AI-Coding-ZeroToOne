export interface ColumnInfo {
  name: string;
  type: string;
}

export interface QueryResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface QueryRequest {
  sql: string;
}

export interface NaturalLanguageRequest {
  question: string;
}

export interface GeneratedQuery {
  sql: string;
  explanation: string;
}
