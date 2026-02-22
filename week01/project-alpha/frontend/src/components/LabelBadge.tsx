import React from 'react';
import { Label } from '@/types/label';
import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  label: Label;
  onClick?: () => void;
  onRemove?: () => void;
  removable?: boolean;
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  onClick,
  onRemove,
  removable = false,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-105 active:scale-95',
        className
      )}
      style={{ 
        backgroundColor: label.color + '15',
        color: label.color,
        border: `1px solid ${label.color}30`
      }}
      onClick={onClick}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
};

export default LabelBadge;
