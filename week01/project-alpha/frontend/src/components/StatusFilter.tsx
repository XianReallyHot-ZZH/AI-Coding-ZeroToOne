import React from 'react';
import { TicketStatus, STATUS_LABELS } from '@/types/ticket';
import { cn } from '@/lib/utils';

interface StatusFilterProps {
  value?: string;
  onChange: (status?: string) => void;
}

const statuses = [
  { value: undefined, label: 'All' },
  { value: TicketStatus.OPEN, label: STATUS_LABELS[TicketStatus.OPEN] },
  { value: TicketStatus.COMPLETED, label: STATUS_LABELS[TicketStatus.COMPLETED] },
  { value: TicketStatus.CANCELLED, label: STATUS_LABELS[TicketStatus.CANCELLED] },
];

export const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl">
      {statuses.map((status) => (
        <button
          key={status.label}
          onClick={() => onChange(status.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            value === status.value
              ? 'bg-white dark:bg-neutral-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;
