import api from './api';
import { Ticket, TicketListResponse, TicketFilter, CreateTicketRequest, UpdateTicketRequest } from '../types/ticket';

const buildQueryParams = (filter: TicketFilter): string => {
  const params = new URLSearchParams();
  
  if (filter.status) params.append('status', filter.status);
  if (filter.label_ids && filter.label_ids.length > 0) {
    params.append('label_ids', filter.label_ids.join(','));
  }
  if (filter.search) params.append('search', filter.search);
  if (filter.page) params.append('page', filter.page.toString());
  if (filter.page_size) params.append('page_size', filter.page_size.toString());
  if (filter.sort_by) params.append('sort_by', filter.sort_by);
  if (filter.sort_order) params.append('sort_order', filter.sort_order);
  
  return params.toString();
};

export const ticketService = {
  getTickets: async (filter: TicketFilter = {}): Promise<TicketListResponse> => {
    const queryString = buildQueryParams(filter);
    const response = await api.get<TicketListResponse>(`/tickets?${queryString}`);
    return response.data;
  },

  getTicket: async (id: number): Promise<Ticket> => {
    const response = await api.get<Ticket>(`/tickets/${id}`);
    return response.data;
  },

  createTicket: async (data: CreateTicketRequest): Promise<Ticket> => {
    const response = await api.post<Ticket>('/tickets', data);
    return response.data;
  },

  updateTicket: async (id: number, data: UpdateTicketRequest): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/tickets/${id}`, data);
    return response.data;
  },

  deleteTicket: async (id: number): Promise<void> => {
    await api.delete(`/tickets/${id}`);
  },

  completeTicket: async (id: number): Promise<Ticket> => {
    const response = await api.post<Ticket>(`/tickets/${id}/complete`);
    return response.data;
  },

  uncompleteTicket: async (id: number): Promise<Ticket> => {
    const response = await api.post<Ticket>(`/tickets/${id}/uncomplete`);
    return response.data;
  },

  cancelTicket: async (id: number): Promise<Ticket> => {
    const response = await api.post<Ticket>(`/tickets/${id}/cancel`);
    return response.data;
  },

  addLabelToTicket: async (ticketId: number, labelId: number): Promise<Ticket> => {
    const response = await api.post<Ticket>(`/tickets/${ticketId}/labels/${labelId}`);
    return response.data;
  },

  removeLabelFromTicket: async (ticketId: number, labelId: number): Promise<Ticket> => {
    const response = await api.delete<Ticket>(`/tickets/${ticketId}/labels/${labelId}`);
    return response.data;
  },
};

export default ticketService;
