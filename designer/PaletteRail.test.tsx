import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { PaletteRail } from '../../src/designer/panes/PaletteRail';
import { defaultRegistry } from '../../src/registry/controls';
import { createDesignerStore } from '../../src/store/designer';
import { DesignerStoreContext } from '../../src/designer/hooks/useDesignerStore';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';

function renderRail(onExpand: () => void) {
  const store = createDesignerStore(makeEmptyQuestionnaire('T'));
  const utils = render(
    <DesignerStoreContext.Provider value={store}>
      <DndContext>
        <PaletteRail registry={defaultRegistry} onExpand={onExpand} />
      </DndContext>
    </DesignerStoreContext.Provider>,
  );
  return { ...utils, store };
}

describe('PaletteRail', () => {
  it('renders an expand chevron and one draggable button per registered plugin', () => {
    renderRail(() => {});
    expect(screen.getByTestId('palette-rail-expand')).toBeInTheDocument();
    for (const plugin of defaultRegistry.all()) {
      const btn = screen.getByTestId(`palette-rail-${plugin.type}`);
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', plugin.label);
    }
  });

  it('calls onExpand when the chevron is clicked', () => {
    const onExpand = vi.fn();
    renderRail(onExpand);
    fireEvent.click(screen.getByTestId('palette-rail-expand'));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('does not call onExpand when a control icon is clicked (drag only)', () => {
    const onExpand = vi.fn();
    renderRail(onExpand);
    const firstPlugin = defaultRegistry.all()[0]!;
    fireEvent.click(screen.getByTestId(`palette-rail-${firstPlugin.type}`));
    expect(onExpand).not.toHaveBeenCalled();
  });

  it('appends a control row to the bottom of the canvas when a palette icon is clicked', () => {
    const { store } = renderRail(() => {});
    const firstPlugin = defaultRegistry.all()[0]!;
    const rowsBefore = store.getState().questionnaire.pages[0]!.rows.length;
    fireEvent.click(screen.getByTestId(`palette-rail-${firstPlugin.type}`));
    const rows = store.getState().questionnaire.pages[0]!.rows;
    expect(rows).toHaveLength(rowsBefore + 1);
    expect(rows[rows.length - 1]!.cols[0]!.type).toBe(firstPlugin.type);
  });
});
