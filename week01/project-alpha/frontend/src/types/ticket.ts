export enum TicketStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Label {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface TicketListResponse {
  data: Ticket[];
  pagination: Pagination;
}

export interface TicketFilter {
  status?: string;
  label_ids?: number[];
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateTicketRequest {
  title: string;
  description?: string;
  label_ids?: number[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.COMPLETED]: 'Completed',
  [TicketStatus.CANCELLED]: 'Cancelled',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-blue-100 text-blue-800',
  [TicketStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [TicketStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};
