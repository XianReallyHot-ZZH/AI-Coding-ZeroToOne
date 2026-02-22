import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusFilter } from '@/components/StatusFilter';
import { TicketStatus } from '@/types/ticket';

describe('StatusFilter', () => {
  it('renders all status options', () => {
    render(<StatusFilter onChange={() => {}} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('highlights selected status', () => {
    render(<StatusFilter value={TicketStatus.OPEN} onChange={() => {}} />);
    const openButton = screen.getByText('Open');
    expect(openButton).toHaveClass('shadow-sm');
  });

  it('calls onChange with correct status', () => {
    const handleChange = vi.fn();
    render(<StatusFilter onChange={handleChange} />);
    fireEvent.click(screen.getByText('Open'));
    expect(handleChange).toHaveBeenCalledWith(TicketStatus.OPEN);
  });

  it('calls onChange with undefined when All is clicked', () => {
    const handleChange = vi.fn();
    render(<StatusFilter value={TicketStatus.OPEN} onChange={handleChange} />);
    fireEvent.click(screen.getByText('All'));
    expect(handleChange).toHaveBeenCalledWith(undefined);
  });
});
