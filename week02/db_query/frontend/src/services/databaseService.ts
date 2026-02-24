import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DatabaseConnection, DatabaseConnectionCreate, DatabaseConnectionListResponse } from "@/types/database";
import type { DatabaseDetail } from "@/types/metadata";

const API_URL = "/api/v1";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useDatabaseList() {
  return useQuery({
    queryKey: ["databases"],
    queryFn: () =>
      fetchJson<DatabaseConnectionListResponse>(`${API_URL}/dbs`).then((res) => res.data),
  });
}

export function useDatabase(name: string) {
  return useQuery({
    queryKey: ["databases", name],
    queryFn: () => fetchJson<DatabaseConnection>(`${API_URL}/dbs/${name}`),
    enabled: !!name,
  });
}

export function useDatabaseDetail(name: string) {
  return useQuery({
    queryKey: ["databases", name, "detail"],
    queryFn: () => fetchJson<DatabaseDetail>(`${API_URL}/dbs/${name}`),
    enabled: !!name,
  });
}

export function useAddDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DatabaseConnectionCreate & { name: string }) =>
      fetchJson<DatabaseConnection>(`${API_URL}/dbs/${data.name}`, {
        method: "PUT",
        body: JSON.stringify({ url: data.url }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
    },
  });
}

export function useDeleteDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      fetchJson<void>(`${API_URL}/dbs/${name}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
    },
  });
}

export function useRefreshDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      fetchJson<DatabaseDetail>(`${API_URL}/dbs/${name}/refresh`, {
        method: "POST",
      }),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["databases", name, "detail"] });
    },
  });
}
