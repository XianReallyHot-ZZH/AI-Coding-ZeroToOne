import { Badge } from './ui/badge';
import { Tag } from '../types';

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelectTag: (tagId: string) => void;
}

export function TagFilter({ tags, selectedTagIds, onSelectTag }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selectedTagIds.length === 0 ? 'default' : 'outline'}
        className="cursor-pointer"
        onClick={() => onSelectTag('')}
      >
        全部
      </Badge>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onSelectTag(tag.id)}
        >
          {tag.name} ({tag.ticket_count || 0})
        </Badge>
      ))}
    </div>
  );
}
