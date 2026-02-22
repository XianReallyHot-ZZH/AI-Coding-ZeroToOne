import { create } from 'zustand';
import { Ticket, Pagination, TicketFilter } from '../types/ticket';
import { Label } from '../types/label';
import { ticketService } from '../services/ticketService';
import { labelService } from '../services/labelService';
import { ApiError } from '../services/api';

interface AppState {
  tickets: Ticket[];
  pagination: Pagination | null;
  labels: Label[];
  filters: TicketFilter;
  loading: boolean;
  error: string | null;
  
  fetchTickets: (filters?: TicketFilter) => Promise<void>;
  fetchLabels: () => Promise<void>;
  setFilters: (filters: Partial<TicketFilter>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  createTicket: (title: string, description?: string, labelIds?: number[]) => Promise<Ticket>;
  updateTicket: (id: number, title?: string, description?: string) => Promise<Ticket>;
  deleteTicket: (id: number) => Promise<void>;
  completeTicket: (id: number) => Promise<void>;
  uncompleteTicket: (id: number) => Promise<void>;
  cancelTicket: (id: number) => Promise<void>;
  
  createLabel: (name: string, color?: string) => Promise<Label>;
  updateLabel: (id: number, name?: string, color?: string) => Promise<Label>;
  deleteLabel: (id: number) => Promise<void>;
  addLabelToTicket: (ticketId: number, labelId: number) => Promise<void>;
  removeLabelFromTicket: (ticketId: number, labelId: number) => Promise<void>;
}

const defaultFilters: TicketFilter = {
  status: undefined,
  label_ids: undefined,
  search: undefined,
  page: 1,
  page_size: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
};

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as ApiError).message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const useStore = create<AppState>((set, get) => ({
  tickets: [],
  pagination: null,
  labels: [],
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  fetchTickets: async (filters?: TicketFilter) => {
    set({ loading: true, error: null });
    try {
      const currentFilters = filters || get().filters;
      const response = await ticketService.getTickets(currentFilters);
      set({ 
        tickets: response.data, 
        pagination: response.pagination,
        filters: currentFilters,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: getErrorMessage(error),
        loading: false 
      });
      throw error;
    }
  },

  fetchLabels: async () => {
    try {
      const labels = await labelService.getLabels();
      set({ labels });
    } catch (error) {
      set({ 
        error: getErrorMessage(error)
      });
      throw error;
    }
  },

  setFilters: (filters: Partial<TicketFilter>) => {
    const currentFilters = get().filters;
    set({ filters: { ...currentFilters, ...filters, page: filters.page ?? 1 } });
  },

  resetFilters: () => {
    set({ filters: { ...defaultFilters } });
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

  createTicket: async (title: string, description?: string, labelIds?: number[]) => {
    const ticket = await ticketService.createTicket({ 
      title, 
      description, 
      label_ids: labelIds 
    });
    await get().fetchTickets();
    return ticket;
  },

  updateTicket: async (id: number, title?: string, description?: string) => {
    const ticket = await ticketService.updateTicket(id, { title, description });
    await get().fetchTickets();
    return ticket;
  },

  deleteTicket: async (id: number) => {
    await ticketService.deleteTicket(id);
    await get().fetchTickets();
  },

  completeTicket: async (id: number) => {
    await ticketService.completeTicket(id);
    await get().fetchTickets();
  },

  uncompleteTicket: async (id: number) => {
    await ticketService.uncompleteTicket(id);
    await get().fetchTickets();
  },

  cancelTicket: async (id: number) => {
    await ticketService.cancelTicket(id);
    await get().fetchTickets();
  },

  createLabel: async (name: string, color?: string) => {
    const label = await labelService.createLabel({ name, color });
    await get().fetchLabels();
    return label;
  },

  updateLabel: async (id: number, name?: string, color?: string) => {
    const label = await labelService.updateLabel(id, { name, color });
    await get().fetchLabels();
    return label;
  },

  deleteLabel: async (id: number) => {
    await labelService.deleteLabel(id);
    await get().fetchLabels();
    await get().fetchTickets();
  },

  addLabelToTicket: async (ticketId: number, labelId: number) => {
    await ticketService.addLabelToTicket(ticketId, labelId);
    await get().fetchTickets();
  },

  removeLabelFromTicket: async (ticketId: number, labelId: number) => {
    await ticketService.removeLabelFromTicket(ticketId, labelId);
    await get().fetchTickets();
  },
}));

export default useStore;
