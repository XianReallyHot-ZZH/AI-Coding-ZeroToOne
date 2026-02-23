import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="w-24 h-24 bg-md-yellow rounded-xl border-2 border-md-blue flex items-center justify-center mb-6 shadow-md-card">
        <FileText className="h-12 w-12 text-md-blue" />
      </div>
      <h3 className="text-2xl font-semibold text-md-gray-900 mb-2">No tickets yet</h3>
      <p className="text-md-gray-600 text-center mb-8 max-w-sm leading-relaxed">
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
