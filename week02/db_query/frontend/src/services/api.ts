import type { DataProvider } from "@refinedev/core";

const API_URL = "/api/v1";

export const dataProvider: DataProvider = {
  getList: async ({ resource }) => {
    const response = await fetch(`${API_URL}/${resource}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${resource}`);
    }
    
    const data = await response.json();
    return {
      data: data.data || data,
      total: data.total || (Array.isArray(data) ? data.length : 0),
    };
  },

  getOne: async ({ resource, id }) => {
    const response = await fetch(`${API_URL}/${resource}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${resource}/${id}`);
    }
    
    const data = await response.json();
    return { data };
  },

  create: async ({ resource, variables }) => {
    const response = await fetch(`${API_URL}/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Failed to create ${resource}`);
    }
    
    const data = await response.json();
    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const response = await fetch(`${API_URL}/${resource}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Failed to update ${resource}`);
    }
    
    const data = await response.json();
    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const response = await fetch(`${API_URL}/${resource}/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Failed to delete ${resource}`);
    }
    
    return { data: { id } as never };
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method, payload, headers }) => {
    const response = await fetch(url, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Request failed");
    }
    
    const data = await response.json();
    return { data };
  },
};
