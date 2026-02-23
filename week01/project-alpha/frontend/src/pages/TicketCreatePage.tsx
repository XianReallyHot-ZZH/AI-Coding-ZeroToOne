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
    <div className="min-h-screen bg-md-off-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-3 text-md-gray-600 hover:text-md-blue" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <p className="eyebrow mb-3">New Ticket</p>
          <h1 className="text-3xl font-bold tracking-tight text-md-gray-900 mb-2">Create a Ticket</h1>
          <p className="text-md-gray-600 leading-relaxed">
            Create a new ticket to track your work
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-md-gray-100 border-b-2 border-md-gray-200">
            <CardTitle className="text-lg text-md-gray-900">Details</CardTitle>
            <CardDescription className="text-md-gray-600">
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
