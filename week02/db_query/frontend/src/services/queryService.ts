import { useMutation } from "@tanstack/react-query";
import type { QueryRequest, QueryResult, NaturalLanguageRequest, GeneratedQuery } from "@/types/query";

const API_URL = "/api/v1";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: { message: "Request failed" } }));
    throw new Error(error.detail?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useExecuteQuery(dbName: string) {
  return useMutation({
    mutationFn: (sql: string) => {
      const request: QueryRequest = { sql };
      return fetchJson<QueryResult>(`${API_URL}/dbs/${dbName}/query`, {
        method: "POST",
        body: JSON.stringify(request),
      });
    },
  });
}

export function useGenerateSql(dbName: string) {
  return useMutation({
    mutationFn: (question: string) => {
      const request: NaturalLanguageRequest = { question };
      return fetchJson<GeneratedQuery>(`${API_URL}/dbs/${dbName}/query/natural`, {
        method: "POST",
        body: JSON.stringify(request),
      });
    },
  });
}
