import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200',
          page <= 1
            ? 'text-md-gray-400 cursor-not-allowed'
            : 'text-md-blue hover:bg-md-blue-light active:scale-95'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-all duration-200',
              page === 1
                ? 'bg-md-yellow text-md-blue border-2 border-md-blue shadow-md-card'
                : 'text-md-blue hover:bg-md-blue-light'
            )}
          >
            1
          </button>
          {startPage > 2 && (
            <span className="px-1 text-md-gray-400">...</span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-all duration-200',
            page === p
              ? 'bg-md-yellow text-md-blue border-2 border-md-blue shadow-md-card'
              : 'text-md-blue hover:bg-md-blue-light'
          )}
        >
          {p}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="px-1 text-md-gray-400">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-all duration-200',
              page === totalPages
                ? 'bg-md-yellow text-md-blue border-2 border-md-blue shadow-md-card'
                : 'text-md-blue hover:bg-md-blue-light'
            )}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200',
          page >= totalPages
            ? 'text-md-gray-400 cursor-not-allowed'
            : 'text-md-blue hover:bg-md-blue-light active:scale-95'
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Pagination;
