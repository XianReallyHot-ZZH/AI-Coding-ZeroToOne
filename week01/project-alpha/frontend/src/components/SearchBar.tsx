import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search tickets...',
}) => {
  return (
    <div className="relative group">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-md-gray-400 transition-colors group-focus-within:text-md-blue" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-11 pr-11 h-11"
      />
      {value && (
        <Button
          variant="ghost"
          size="iconSm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-md-blue-light"
          onClick={() => onChange('')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default SearchBar;
