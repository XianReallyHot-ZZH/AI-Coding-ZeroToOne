import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TicketList } from '@/components/TicketList';
import { Ticket, TicketStatus } from '@/types/ticket';
import { Label } from '@/types/label';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockLabels: Label[] = [
  { id: 1, name: 'Bug', color: '#FF0000', created_at: '2024-01-01T00:00:00', updated_at: '2024-01-01T00:00:00' },
  { id: 2, name: 'Feature', color: '#00FF00', created_at: '2024-01-01T00:00:00', updated_at: '2024-01-01T00:00:00' },
];

const mockTickets: Ticket[] = [
  {
    id: 1,
    title: 'Test Ticket 1',
    description: 'Description 1',
    status: TicketStatus.OPEN,
    labels: [mockLabels[0]],
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
  },
  {
    id: 2,
    title: 'Test Ticket 2',
    description: 'Description 2',
    status: TicketStatus.COMPLETED,
    labels: [],
    created_at: '2024-01-02T00:00:00',
    updated_at: '2024-01-02T00:00:00',
  },
];

const mockHandlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onComplete: vi.fn(),
  onUncomplete: vi.fn(),
  onCancel: vi.fn(),
};

describe('TicketList', () => {
  it('shows loading skeletons when loading', () => {
    const { container } = renderWithRouter(<TicketList tickets={[]} loading={true} {...mockHandlers} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(6);
  });

  it('shows empty state when no tickets', () => {
    renderWithRouter(<TicketList tickets={[]} loading={false} {...mockHandlers} />);
    expect(screen.getByText('No Tickets Yet')).toBeInTheDocument();
  });

  it('renders tickets when provided', () => {
    renderWithRouter(<TicketList tickets={mockTickets} loading={false} {...mockHandlers} />);
    expect(screen.getByText('Test Ticket 1')).toBeInTheDocument();
    expect(screen.getByText('Test Ticket 2')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    renderWithRouter(<TicketList tickets={mockTickets} loading={false} {...mockHandlers} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows labels on tickets', () => {
    renderWithRouter(<TicketList tickets={mockTickets} loading={false} {...mockHandlers} />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });
});
