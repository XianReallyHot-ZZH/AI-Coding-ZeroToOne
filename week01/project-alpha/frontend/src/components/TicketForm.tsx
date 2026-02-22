import React, { useState, useEffect } from 'react';
import { Label } from '@/types/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LabelBadge } from '@/components/LabelBadge';
import { Plus } from 'lucide-react';

interface TicketFormProps {
  initialTitle?: string;
  initialDescription?: string;
  initialLabels?: number[];
  labels: Label[];
  onSubmit: (title: string, description: string, labelIds: number[]) => void;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  initialTitle = '',
  initialDescription = '',
  initialLabels = [],
  labels,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isLoading = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(initialLabels);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setSelectedLabelIds(initialLabels);
  }, [initialTitle, initialDescription, initialLabels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim(), selectedLabelIds);
  };

  const toggleLabel = (labelId: number) => {
    if (selectedLabelIds.includes(labelId)) {
      setSelectedLabelIds(selectedLabelIds.filter((id) => id !== labelId));
    } else {
      setSelectedLabelIds([...selectedLabelIds, labelId]);
    }
  };

  const selectedLabels = labels.filter((l) => selectedLabelIds.includes(l.id));
  const availableLabels = labels.filter((l) => !selectedLabelIds.includes(l.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter ticket title..."
          maxLength={200}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter ticket description..."
          rows={4}
          maxLength={5000}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Labels</label>
        
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedLabels.map((label) => (
              <LabelBadge
                key={label.id}
                label={label}
                removable
                onRemove={() => toggleLabel(label.id)}
              />
            ))}
          </div>
        )}

        {labels.length > 0 && (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLabelPicker(!showLabelPicker)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Label
            </Button>

            {showLabelPicker && availableLabels.length > 0 && (
              <div className="absolute z-10 mt-2 p-2 bg-background border rounded-lg shadow-lg min-w-[150px]">
                {availableLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => {
                      toggleLabel(label.id);
                      setShowLabelPicker(false);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-accent text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm">{label.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default TicketForm;
