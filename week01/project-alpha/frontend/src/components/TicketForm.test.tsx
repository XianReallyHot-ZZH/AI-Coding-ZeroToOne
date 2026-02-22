import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketForm } from '@/components/TicketForm';
import { Label } from '@/types/label';

const mockLabels: Label[] = [
  { id: 1, name: 'Bug', color: '#FF0000', created_at: '2024-01-01T00:00:00', updated_at: '2024-01-01T00:00:00' },
  { id: 2, name: 'Feature', color: '#00FF00', created_at: '2024-01-01T00:00:00', updated_at: '2024-01-01T00:00:00' },
];

describe('TicketForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form fields', () => {
    render(
      <TicketForm
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(/labels/i)).toBeInTheDocument();
  });

  it('submits form with correct values', () => {
    render(
      <TicketForm
        initialTitle="Test Title"
        initialDescription="Test Description"
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Test Title', 'Test Description', []);
  });

  it('does not submit with empty title', () => {
    render(
      <TicketForm
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <TicketForm
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('populates form with initial values', () => {
    render(
      <TicketForm
        initialTitle="Initial Title"
        initialDescription="Initial Description"
        initialLabels={[1]}
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial Description')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('shows custom submit label', () => {
    render(
      <TicketForm
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        submitLabel="Create Ticket"
      />
    );

    expect(screen.getByText('Create Ticket')).toBeInTheDocument();
  });

  it('disables submit button when loading', () => {
    render(
      <TicketForm
        labels={mockLabels}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeDisabled();
  });
});
