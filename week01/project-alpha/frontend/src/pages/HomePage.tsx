import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { TicketList } from '@/components/TicketList';
import { SearchBar } from '@/components/SearchBar';
import { StatusFilter } from '@/components/StatusFilter';
import { LabelFilter } from '@/components/LabelFilter';
import { Pagination } from '@/components/Pagination';
import { LabelManager } from '@/components/LabelManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TicketForm } from '@/components/TicketForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, RefreshCw, Moon, Sun } from 'lucide-react';
import { Ticket } from '@/types/ticket';
import { useToast } from '@/components/Toast';
import { ApiError } from '@/services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isDark, setIsDark] = useState(false);
  
  const {
    tickets,
    pagination,
    labels,
    filters,
    loading,
    fetchTickets,
    fetchLabels,
    setFilters,
    resetFilters,
    deleteTicket,
    completeTicket,
    uncompleteTicket,
    cancelTicket,
    createLabel,
    updateLabel,
    deleteLabel,
  } = useStore();

  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ticketId: number | null }>({
    open: false,
    ticketId: null,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchTickets();
        await fetchLabels();
      } catch (error) {
        const message = (error as ApiError).message || 'Failed to load data';
        toast.addToast(message, 'error');
      }
    };
    loadData();
  }, [fetchTickets, fetchLabels]);

  useEffect(() => {
    fetchTickets().catch((error) => {
      const message = (error as ApiError).message || 'Failed to fetch tickets';
      toast.addToast(message, 'error');
    });
  }, [filters, fetchTickets]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const handleSearch = (search: string) => {
    setFilters({ search, page: 1 });
  };

  const handleStatusChange = (status?: string) => {
    setFilters({ status, page: 1 });
  };

  const handleLabelChange = (label_ids: number[]) => {
    setFilters({ label_ids: label_ids.length > 0 ? label_ids : undefined, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ page });
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ open: true, ticketId: id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.ticketId) {
      try {
        await deleteTicket(deleteConfirm.ticketId);
        toast.addToast('Ticket deleted successfully', 'success');
      } catch (error) {
        const message = (error as ApiError).message || 'Failed to delete ticket';
        toast.addToast(message, 'error');
      }
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeTicket(id);
      toast.addToast('Ticket marked as completed', 'success');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to complete ticket';
      toast.addToast(message, 'error');
    }
  };

  const handleUncomplete = async (id: number) => {
    try {
      await uncompleteTicket(id);
      toast.addToast('Ticket reopened', 'success');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to reopen ticket';
      toast.addToast(message, 'error');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelTicket(id);
      toast.addToast('Ticket cancelled', 'success');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to cancel ticket';
      toast.addToast(message, 'error');
    }
  };

  const handleLabelClick = (labelId: number) => {
    const currentLabelIds = filters.label_ids || [];
    if (!currentLabelIds.includes(labelId)) {
      handleLabelChange([...currentLabelIds, labelId]);
    }
  };

  const handleUpdateTicket = async (title: string, description: string) => {
    if (editingTicket) {
      try {
        await useStore.getState().updateTicket(editingTicket.id, title, description);
        toast.addToast('Ticket updated successfully', 'success');
        setShowEditDialog(false);
        setEditingTicket(null);
      } catch (error) {
        const message = (error as ApiError).message || 'Failed to update ticket';
        toast.addToast(message, 'error');
      }
    }
  };

  const handleCreateLabel = async (name: string, color: string) => {
    try {
      await createLabel(name, color);
      toast.addToast('Label created successfully', 'success');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to create label';
      toast.addToast(message, 'error');
      throw error;
    }
  };

  const handleUpdateLabel = async (id: number, name: string, color: string) => {
    try {
      await updateLabel(id, name, color);
      toast.addToast('Label updated successfully', 'success');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to update label';
      toast.addToast(message, 'error');
      throw error;
    }
  };

  const handleDeleteLabel = async (id: number) => {
    try {
      await deleteLabel(id);
      toast.addToast('Label deleted successfully', 'success');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to delete label';
      toast.addToast(message, 'error');
      throw error;
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchTickets();
      toast.addToast('Data refreshed', 'info');
    } catch (error) {
      const message = (error as ApiError).message || 'Failed to refresh data';
      toast.addToast(message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-md-off-white">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b-2 border-md-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-md-yellow border-2 border-md-blue flex items-center justify-center shadow-md-card">
                <span className="text-md-blue font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-semibold tracking-tight text-md-gray-900">Tickets</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="iconSm" onClick={toggleTheme}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="iconSm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => navigate('/tickets/new')} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Ticket
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-12">
          <p className="eyebrow mb-3">Ticket Management</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-md-gray-900 mb-4">
            Manage your work
          </h1>
          <p className="text-lg text-md-gray-600 max-w-2xl leading-relaxed">
            Track tasks, bugs, and feature requests with a clean, intuitive interface.
          </p>
        </section>

        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-md-gray-100 border-b-2 border-md-gray-200">
            <CardTitle className="text-base font-semibold text-md-gray-900">Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  value={filters.search || ''}
                  onChange={handleSearch}
                />
              </div>
              <StatusFilter
                value={filters.status}
                onChange={handleStatusChange}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {labels.length > 0 && (
                <LabelFilter
                  labels={labels}
                  selectedIds={filters.label_ids || []}
                  onChange={handleLabelChange}
                />
              )}
              <LabelManager
                labels={labels}
                onCreate={handleCreateLabel}
                onUpdate={handleUpdateLabel}
                onDelete={handleDeleteLabel}
              />
            </div>

            {(filters.status || filters.label_ids?.length || filters.search) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        <TicketList
          tickets={tickets}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onCancel={handleCancel}
          onLabelClick={handleLabelClick}
        />

        {pagination && pagination.total_pages > 1 && (
          <div className="mt-10 flex justify-center">
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </main>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>
          {editingTicket && (
            <TicketForm
              initialTitle={editingTicket.title}
              initialDescription={editingTicket.description || ''}
              initialLabels={editingTicket.labels.map((l) => l.id)}
              labels={labels}
              onSubmit={handleUpdateTicket}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingTicket(null);
              }}
              submitLabel="Update"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, ticketId: null })}
        title="Delete Ticket"
        description="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
};

export default HomePage;
