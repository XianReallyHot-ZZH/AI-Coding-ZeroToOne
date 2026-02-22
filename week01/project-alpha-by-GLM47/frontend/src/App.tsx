import { useState } from 'react';
import { Button } from './components/ui/button';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { SearchBar } from './components/SearchBar';
import { TagFilter } from './components/TagFilter';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { Toaster } from './components/Toaster';
import { useTickets } from './hooks/useTickets';
import { Plus } from 'lucide-react';
import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from './types';

function App() {
  const {
    tickets,
    tags,
    selectedTags,
    searchQuery,
    loading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    toggleComplete,
    addTag,
    removeTag,
    setSelectedTags,
    setSearchQuery,
  } = useTickets();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateTicket = async (data: CreateTicketDTO) => {
    await createTicket(data);
  };

  const handleUpdateTicket = async (data: UpdateTicketDTO) => {
    if (editingTicket) {
      await updateTicket(editingTicket.id, data);
    }
  };

  const handleEditClick = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteTicket(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTicket(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster error={error} />
      
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Ticket Manager</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4 mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTags}
            onSelectTag={(tagId) => setSelectedTags(tagId ? [tagId] : [])}
          />
          <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            新建 Ticket
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <TicketList
            tickets={tickets}
            onToggleComplete={toggleComplete}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        )}
      </main>
      
      <TicketForm
        mode={editingTicket ? 'edit' : 'create'}
        ticket={editingTicket}
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingTicket ? handleUpdateTicket : handleCreateTicket}
      />
      
      <DeleteConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default App;
