import React from 'react';
import { Ticket } from '@/types/ticket';
import { TicketCard } from '@/components/TicketCard';
import { EmptyState } from '@/components/EmptyState';

interface TicketListProps {
  tickets: Ticket[];
  loading: boolean;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
  onUncomplete: (id: number) => void;
  onCancel: (id: number) => void;
  onLabelClick?: (labelId: number) => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  loading,
  onEdit,
  onDelete,
  onComplete,
  onUncomplete,
  onCancel,
  onLabelClick,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-44 bg-neutral-100 dark:bg-neutral-800/50 animate-pulse rounded-2xl"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {tickets.map((ticket, index) => (
        <div
          key={ticket.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <TicketCard
            ticket={ticket}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onCancel={onCancel}
            onLabelClick={onLabelClick}
          />
        </div>
      ))}
    </div>
  );
};

export default TicketList;
