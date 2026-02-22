import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import { TicketForm } from '@/components/TicketForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { Ticket } from '@/types/ticket';
import { useToast } from '@/components/Toast';
import { ApiError } from '@/services/api';

export const TicketEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { labels, fetchLabels, updateTicket } = useStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchLabels();
        if (id) {
          const ticketData = await ticketService.getTicket(parseInt(id));
          setTicket(ticketData);
        }
      } catch (error) {
        const message = (error as ApiError).message || 'Failed to load ticket';
        toast.addToast(message, 'error');
        navigate('/');
      } finally {
        setIsFetching(false);
      }
    };
    loadData();
  }, [id, fetchLabels, navigate]);

  const handleSubmit = async (title: string, description: string, _labelIds: number[]) => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      await updateTicket(parseInt(id), title, description);
      toast.addToast('Ticket updated successfully', 'success');
      navigate('/');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to update ticket';
      toast.addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            <div className="h-10 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            <div className="h-80 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Edit Ticket</h1>
          <p className="text-muted-foreground">
            Update the ticket information
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200/50 dark:border-neutral-800">
            <CardTitle className="text-lg">Details</CardTitle>
            <CardDescription>
              Modify the ticket information below
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <TicketForm
              initialTitle={ticket.title}
              initialDescription={ticket.description || ''}
              initialLabels={ticket.labels.map((l) => l.id)}
              labels={labels}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel="Update Ticket"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketEditPage;
