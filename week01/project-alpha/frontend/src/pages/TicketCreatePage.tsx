import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { TicketForm } from '@/components/TicketForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ApiError } from '@/services/api';

export const TicketCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { labels, fetchLabels, createTicket } = useStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLabels().catch((error) => {
      const message = (error as ApiError).message || 'Failed to load labels';
      toast.addToast(message, 'error');
    });
  }, [fetchLabels]);

  const handleSubmit = async (title: string, description: string, labelIds: number[]) => {
    setIsLoading(true);
    try {
      await createTicket(title, description, labelIds);
      toast.addToast('Ticket created successfully', 'success');
      navigate('/');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to create ticket';
      toast.addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-3 text-muted-foreground hover:text-foreground" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">New Ticket</h1>
          <p className="text-muted-foreground">
            Create a new ticket to track your work
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200/50 dark:border-neutral-800">
            <CardTitle className="text-lg">Details</CardTitle>
            <CardDescription>
              Fill in the ticket information below
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <TicketForm
              labels={labels}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel="Create Ticket"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketCreatePage;
