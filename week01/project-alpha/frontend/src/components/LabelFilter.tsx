import React from 'react';
import { Label } from '@/types/label';
import { cn } from '@/lib/utils';

interface LabelFilterProps {
  labels: Label[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export const LabelFilter: React.FC<LabelFilterProps> = ({
  labels,
  selectedIds,
  onChange,
}) => {
  const toggleLabel = (labelId: number) => {
    if (selectedIds.includes(labelId)) {
      onChange(selectedIds.filter((id) => id !== labelId));
    } else {
      onChange([...selectedIds, labelId]);
    }
  };

  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => {
        const isSelected = selectedIds.includes(label.id);
        return (
          <button
            key={label.id}
            onClick={() => toggleLabel(label.id)}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-all',
              'border-2',
              isSelected
                ? 'ring-2 ring-offset-1'
                : 'opacity-60 hover:opacity-100'
            )}
            style={{
              backgroundColor: isSelected ? label.color + '30' : 'transparent',
              borderColor: label.color,
              color: label.color,
              ...(isSelected && { ringColor: label.color }),
            }}
          >
            {label.name}
          </button>
        );
      })}
    </div>
  );
};

export default LabelFilter;
