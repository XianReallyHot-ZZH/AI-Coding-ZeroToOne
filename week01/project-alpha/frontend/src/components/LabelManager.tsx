import React, { useState } from 'react';
import { Label } from '@/types/label';
import { PRESET_COLORS } from '@/types/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface LabelManagerProps {
  labels: Label[];
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: number, name: string, color: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const LabelManager: React.FC<LabelManagerProps> = ({
  labels,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const openCreate = () => {
    setEditingLabel(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setIsOpen(true);
  };

  const openEdit = (label: Label) => {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingLabel(null);
    setName('');
    setColor(PRESET_COLORS[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      if (editingLabel) {
        await onUpdate(editingLabel.id, name.trim(), color);
      } else {
        await onCreate(name.trim(), color);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save label:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this label?')) return;
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openCreate}>
        <Plus className="h-4 w-4 mr-1" />
        Manage Labels
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? 'Edit Label' : 'Create Label'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="label-name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input
                id="label-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Label name..."
                maxLength={50}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Custom:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-24"
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                {isLoading ? 'Saving...' : editingLabel ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>

          {labels.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Existing Labels</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm">{label.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(label)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(label.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LabelManager;
