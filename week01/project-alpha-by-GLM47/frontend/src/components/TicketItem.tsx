import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, Edit2, Trash2, Plus, X as XIcon } from 'lucide-react';
import type { Ticket, Tag } from '../types';

interface TicketItemProps {
  ticket: Ticket;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onAddTag: (ticketId: string, tagName: string) => Promise<void>;
  onRemoveTag: (ticketId: string, tagId: string) => Promise<void>;
}

export function TicketItem({ ticket, onToggleComplete, onEdit, onDelete, onAddTag, onRemoveTag }: TicketItemProps) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      try {
        await onAddTag(ticket.id, newTagName.trim());
        setNewTagName('');
        setShowAddTag(false);
      } catch (err) {
        console.error('Failed to add tag:', err);
      }
    }
  };

  return (
    <Card className={`p-4 ${ticket.is_completed ? 'opacity-60 bg-gray-50' : ''}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${ticket.is_completed ? 'line-through text-gray-500' : ''}`}>
            {ticket.title}
          </h3>
          
          {ticket.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {ticket.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {ticket.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                {tag.name}
                <button
                  onClick={() => onRemoveTag(ticket.id, tag.id)}
                  className="ml-1 hover:text-red-500"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {showAddTag ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="标签名"
                  className="px-2 py-1 text-sm border rounded"
                  autoFocus
                />
                <Button size="sm" onClick={handleAddTag}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTag(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddTag(true)}
                className="h-6"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <p className="text-xs text-gray-400 mt-2">
            创建于 {new Date(ticket.created_at).toLocaleString('zh-CN')}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={ticket.is_completed ? "outline" : "default"}
            onClick={() => onToggleComplete(ticket.id, !ticket.is_completed)}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(ticket)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(ticket.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
