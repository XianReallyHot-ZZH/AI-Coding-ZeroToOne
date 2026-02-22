export interface Tag {
  id: string;
  name: string;
  created_at: string;
  ticket_count?: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface CreateTicketDTO {
  title: string;
  description?: string;
  tag_names?: string[];
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
}

export interface TagListResponse {
  tags: Tag[];
}
