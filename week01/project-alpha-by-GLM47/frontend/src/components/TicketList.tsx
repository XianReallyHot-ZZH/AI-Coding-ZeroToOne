import { Card } from './ui/card';
import { TicketItem } from './TicketItem';
import type { Ticket } from '../types';

interface TicketListProps {
  tickets: Ticket[];
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onAddTag: (ticketId: string, tagName: string) => Promise<void>;
  onRemoveTag: (ticketId: string, tagId: string) => Promise<void>;
}

export function TicketList({ tickets, onToggleComplete, onEdit, onDelete, onAddTag, onRemoveTag }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">暂无 Ticket</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketItem
          key={ticket.id}
          ticket={ticket}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
        />
      ))}
    </div>
  );
}
