import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { X, Plus } from 'lucide-react';
import type { CreateTicketDTO, UpdateTicketDTO, Ticket, Tag } from '../types';

interface TicketFormProps {
  mode: 'create' | 'edit';
  ticket?: Ticket;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTicketDTO | UpdateTicketDTO) => Promise<void>;
}

export function TicketForm({ mode, ticket, open, onClose, onSubmit }: TicketFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'edit' && ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setTagNames(ticket.tags.map(t => t.name));
    } else {
      setTitle('');
      setDescription('');
      setTagNames([]);
      setTagInput('');
    }
  }, [mode, ticket, open]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tagNames.includes(tagInput.trim())) {
      setTagNames([...tagNames, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setTagNames(tagNames.filter(t => t !== tagName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateTicketDTO | UpdateTicketDTO = {
      title,
      description: description || undefined,
    };
    
    if (mode === 'create') {
      (data as CreateTicketDTO).tag_names = tagNames;
    }
    
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '创建新 Ticket' : '编辑 Ticket'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入 Ticket 标题"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              描述
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入 Ticket 描述（可选）"
              rows={4}
            />
          </div>
          
          {mode === 'create' && (
            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-1">
                标签
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签名称"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagNames.map((tagName) => (
                  <Badge key={tagName} variant="secondary" className="flex items-center gap-1">
                    {tagName}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tagName)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
