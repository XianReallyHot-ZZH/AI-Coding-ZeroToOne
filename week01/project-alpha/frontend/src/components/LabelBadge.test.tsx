import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LabelBadge } from '@/components/LabelBadge';
import { Label } from '@/types/label';

describe('LabelBadge', () => {
  const mockLabel: Label = {
    id: 1,
    name: 'Bug',
    color: '#FF0000',
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
  };

  it('renders label name', () => {
    render(<LabelBadge label={mockLabel} />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('applies correct color styles', () => {
    const { container } = render(<LabelBadge label={mockLabel} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.backgroundColor).toContain('rgba(255, 0, 0');
    expect(badge.style.color).toBe('rgb(255, 0, 0)');
  });

  it('shows remove button when removable is true', () => {
    render(<LabelBadge label={mockLabel} removable onRemove={() => {}} />);
    expect(screen.getByText('×')).toBeInTheDocument();
  });

  it('hides remove button when removable is false', () => {
    render(<LabelBadge label={mockLabel} removable={false} />);
    expect(screen.queryByText('×')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    let clicked = false;
    render(<LabelBadge label={mockLabel} onClick={() => { clicked = true; }} />);
    screen.getByText('Bug').click();
    expect(clicked).toBe(true);
  });

  it('calls onRemove when remove button is clicked', () => {
    let removed = false;
    render(<LabelBadge label={mockLabel} removable onRemove={() => { removed = true; }} />);
    screen.getByText('×').click();
    expect(removed).toBe(true);
  });
});
