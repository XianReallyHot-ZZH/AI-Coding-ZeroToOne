import { useState, useEffect, useCallback } from 'react';
import { ticketApi, tagApi } from '../services/api';
import type { Ticket, Tag, CreateTicketDTO, UpdateTicketDTO } from '../types';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedTags.length > 0) {
        params.tag_id = selectedTags[0];
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await ticketApi.getAll(params);
      setTickets(data.tickets);
    } catch (err) {
      setError('Failed to fetch tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTags, searchQuery]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await tagApi.getAll();
      setTags(data.tags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchTags();
  }, [fetchTickets, fetchTags]);

  const createTicket = useCallback(async (data: CreateTicketDTO) => {
    setLoading(true);
    try {
      await ticketApi.create(data);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to create ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets, fetchTags]);

  const updateTicket = useCallback(async (id: string, data: UpdateTicketDTO) => {
    setLoading(true);
    try {
      await ticketApi.update(id, data);
      await fetchTickets();
    } catch (err) {
      setError('Failed to update ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  const deleteTicket = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await ticketApi.delete(id);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to delete ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets, fetchTags]);

  const toggleComplete = useCallback(async (id: string, isCompleted: boolean) => {
    setLoading(true);
    try {
      await ticketApi.toggleComplete(id, isCompleted);
      await fetchTickets();
    } catch (err) {
      setError('Failed to update ticket status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  const addTag = useCallback(async (ticketId: string, tagName: string) => {
    try {
      await ticketApi.addTag(ticketId, tagName);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to add tag');
      throw err;
    }
  }, [fetchTickets, fetchTags]);

  const removeTag = useCallback(async (ticketId: string, tagId: string) => {
    try {
      await ticketApi.removeTag(ticketId, tagId);
      await fetchTickets();
      await fetchTags();
    } catch (err) {
      setError('Failed to remove tag');
      throw err;
    }
  }, [fetchTickets, fetchTags]);

  return {
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
  };
}
