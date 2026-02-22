import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="w-20 h-20 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <FileText className="h-10 w-10 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
      <p className="text-muted-foreground text-center mb-8 max-w-sm leading-relaxed">
        Create your first ticket to start tracking tasks, bugs, and feature requests.
      </p>
      <Button asChild size="lg">
        <Link to="/tickets/new">
          <Plus className="h-4 w-4 mr-2" />
          Create First Ticket
        </Link>
      </Button>
    </div>
  );
};

export default EmptyState;
