import React from 'react';
import { Ticket, TicketStatus, STATUS_LABELS } from '@/types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LabelBadge } from '@/components/LabelBadge';
import { MoreHorizontal, Check, X, RotateCcw, Pencil, Trash2 } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
  onUncomplete: (id: number) => void;
  onCancel: (id: number) => void;
  onLabelClick?: (labelId: number) => void;
}

const statusStyles: Record<TicketStatus, { bg: string; text: string; dot: string; border: string }> = {
  [TicketStatus.OPEN]: {
    bg: 'bg-md-blue-light',
    text: 'text-md-blue',
    dot: 'bg-md-blue',
    border: 'border border-md-blue/15',
  },
  [TicketStatus.COMPLETED]: {
    bg: 'bg-teal-50',
    text: 'text-md-teal',
    dot: 'bg-md-teal',
    border: 'border border-teal-200/50',
  },
  [TicketStatus.CANCELLED]: {
    bg: 'bg-md-gray-100',
    text: 'text-md-gray-400',
    dot: 'bg-md-gray-400',
    border: 'border border-md-gray-200/50',
  },
};

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onEdit,
  onDelete,
  onComplete,
  onUncomplete,
  onCancel,
  onLabelClick,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const statusStyle = statusStyles[ticket.status as TicketStatus];

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card className="group relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight line-clamp-2 mb-2">
              {ticket.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {STATUS_LABELS[ticket.status as TicketStatus]}
              </div>
              <span className="text-xs text-md-gray-400">
                {formatDate(ticket.created_at)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="iconSm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleAction(() => onEdit(ticket))}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {ticket.status === TicketStatus.OPEN && (
                <>
                  <DropdownMenuItem onClick={handleAction(() => onComplete(ticket.id))}>
                    <Check className="mr-2 h-4 w-4 text-md-teal" />
                    Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAction(() => onCancel(ticket.id))}>
                    <X className="mr-2 h-4 w-4 text-md-gray-400" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
              {ticket.status === TicketStatus.COMPLETED && (
                <DropdownMenuItem onClick={handleAction(() => onUncomplete(ticket.id))}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reopen
                </DropdownMenuItem>
              )}
              {ticket.status === TicketStatus.CANCELLED && (
                <DropdownMenuItem onClick={handleAction(() => onUncomplete(ticket.id))}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleAction(() => onDelete(ticket.id))}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {ticket.description && (
          <p className="text-sm text-md-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {ticket.description}
          </p>
        )}
        {ticket.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ticket.labels.map((label) => (
              <LabelBadge
                key={label.id}
                label={label}
                onClick={() => onLabelClick?.(label.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketCard;
