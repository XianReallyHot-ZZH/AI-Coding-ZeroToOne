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
    <div className="flex p-1 bg-md-gray-100 rounded-lg border-2 border-md-gray-200">
      {statuses.map((status) => (
        <button
          key={status.label}
          onClick={() => onChange(status.value)}
          className={cn(
            'px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200',
            value === status.value
              ? 'bg-white text-md-blue border-2 border-md-blue shadow-md-card'
              : 'text-md-gray-600 hover:text-md-gray-900'
          )}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;
