import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EmptyState', () => {
  it('renders empty state message', () => {
    renderWithRouter(<EmptyState />);
    expect(screen.getByText('No Tickets Yet')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderWithRouter(<EmptyState />);
    expect(screen.getByText(/Get started by creating your first ticket/)).toBeInTheDocument();
  });

  it('renders create button', () => {
    renderWithRouter(<EmptyState />);
    expect(screen.getByText('Create First Ticket')).toBeInTheDocument();
  });

  it('has correct link to create ticket page', () => {
    renderWithRouter(<EmptyState />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tickets/new');
  });
});
