import axios from 'axios';
import type {
  Ticket,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketListResponse,
  Tag,
  TagListResponse
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ticketApi = {
  getAll: async (params?: {
    tag_id?: string;
    search?: string;
    status?: string;
  }): Promise<TicketListResponse> => {
    const response = await api.get<TicketListResponse>('/api/tickets', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Ticket> => {
    const response = await api.get<Ticket>(`/api/tickets/${id}`);
    return response.data;
  },

  create: async (data: CreateTicketDTO): Promise<Ticket> => {
    const response = await api.post<Ticket>('/api/tickets', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTicketDTO): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/api/tickets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/tickets/${id}`);
  },

  toggleComplete: async (id: string, isCompleted: boolean): Promise<Ticket> => {
    const endpoint = isCompleted 
      ? `/api/tickets/${id}/complete`
      : `/api/tickets/${id}/incomplete`;
    const response = await api.patch<Ticket>(endpoint);
    return response.data;
  },

  addTag: async (ticketId: string, tagName: string): Promise<Tag> => {
    const response = await api.post<Tag>(`/api/tickets/${ticketId}/tags`, { tag_name: tagName });
    return response.data;
  },

  removeTag: async (ticketId: string, tagId: string): Promise<void> => {
    await api.delete(`/api/tickets/${ticketId}/tags/${tagId}`);
  },
};

export const tagApi = {
  getAll: async (): Promise<TagListResponse> => {
    const response = await api.get<TagListResponse>('/api/tags');
    return response.data;
  },
};
