import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectorRail } from '../../src/designer/panes/InspectorRail';

describe('InspectorRail', () => {
  it('renders expand chevron and a hollow dot when nothing is selected', () => {
    render(<InspectorRail hasSelection={false} onExpand={() => {}} />);
    expect(screen.getByTestId('inspector-rail-expand')).toBeInTheDocument();
    const dot = screen.getByTestId('inspector-rail-dot');
    expect(dot).toBeInTheDocument();
    expect(dot.hasAttribute('data-selected')).toBe(false);
  });

  it('marks the dot as selected when hasSelection is true', () => {
    render(<InspectorRail hasSelection={true} onExpand={() => {}} />);
    const dot = screen.getByTestId('inspector-rail-dot');
    expect(dot.hasAttribute('data-selected')).toBe(true);
  });

  it('calls onExpand when either the chevron or the dot is clicked', () => {
    const onExpand = vi.fn();
    render(<InspectorRail hasSelection={false} onExpand={onExpand} />);
    fireEvent.click(screen.getByTestId('inspector-rail-expand'));
    fireEvent.click(screen.getByTestId('inspector-rail-dot-btn'));
    expect(onExpand).toHaveBeenCalledTimes(2);
  });
});
