import { useMemo, useState } from 'react';
import { MouseSensor, TouchSensor, DndContext, closestCenter, pointerWithin, rectIntersection, useSensor, useSensors, type CollisionDetection } from '@dnd-kit/core';
import { makeEmptyQuestionnaire } from '../schema/factories';
import { createDesignerStore, type DesignerStore } from '../store/designer';
import { DesignerStoreContext, useDesignerStore } from './hooks/useDesignerStore';
import { useCanvasDnd } from './hooks/useCanvasDnd';
import { usePaneCollapsed } from './hooks/usePaneCollapsed';
import { defaultRegistry } from '../registry/controls';
import type { ControlPlugin } from '../registry/types';
import type { Questionnaire } from '../schema/types';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { TopBar } from './TopBar';
import { PalettePane } from './panes/PalettePane';
import { PaletteRail } from './panes/PaletteRail';
import { CanvasPane } from './panes/CanvasPane';
import { PropertiesPane } from './panes/PropertiesPane';
import { InspectorRail } from './panes/InspectorRail';
import { PageTabs } from './panes/PageTabs';
import './styles.css';

export interface QuestionnaireDesignerProps {
  initial?: Questionnaire;
  plugins?: ControlPlugin[];
  onChange?: (q: Questionnaire) => void;
  onExport?: (q: Questionnaire, includeLogic: boolean) => void;
}

const PALETTE_KEY = 'qnn.pane.palette.collapsed.v1';
const INSPECTOR_KEY = 'qnn.pane.inspector.collapsed.v1';

function InspectorRailSlot({ onExpand }: { onExpand: () => void }) {
  const store = useDesignerStore();
  const hasSelection = store((s) => s.selection.controlId !== null);
  return <InspectorRail hasSelection={hasSelection} onExpand={onExpand} />;
}

/** Inner component that has access to the store context and wraps everything in a shared DndContext. */
function DesignerShell({ registry, onExport }: { registry: ControlRegistry; onExport?: (q: Questionnaire, includeLogic: boolean) => void }) {
  // Separate Mouse + Touch sensors (instead of one PointerSensor). On mobile,
  // PointerSensor's PointerEvents race the browser's pan gesture and lose —
  // pointercancel fires mid-drag and the drop never registers. TouchSensor binds
  // non-passive touchmove listeners so its preventDefault() actually wins. We
  // use `distance` activation (not `delay`) so the non-passive listeners bind
  // at touchstart, before any passive touchmove can leak through and let the
  // browser hijack the gesture.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
  );
  const { onDragEnd, onDragOver, onDragStart, overId, activeId } = useCanvasDnd(registry);
  const [paletteCollapsed, setPaletteCollapsed] = usePaneCollapsed(PALETTE_KEY);
  const [inspectorCollapsed, setInspectorCollapsed] = usePaneCollapsed(INSPECTOR_KEY);

  // Pointer-first collision detection. rectIntersection was unreliable: a tall
  // dragged cell's bounding box overlaps multiple row gaps and neighboring
  // cells at once, so the hover target flickered and drops landed in the wrong
  // slot. pointerWithin reflects the user's actual intent (what's under the
  // cursor). rectIntersection still runs as a fallback for the brief moments
  // the pointer is between droppables (e.g. sliding across a 2px row border)
  // and closestCenter as a last resort so a drop never misses entirely.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const trashHit = pointerHits.find((c) => c.id === 'palette-trash');
    if (trashHit) return [trashHit];
    if (pointerHits.length > 0) return pointerHits;
    const rectHits = rectIntersection(args);
    if (rectHits.length > 0) return rectHits;
    return closestCenter(args);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar registry={registry} {...(onExport ? { onExport } : {})} />
        <PageTabs />
        <div
          className="qnn-shell"
          {...(paletteCollapsed ? { 'data-left-collapsed': '' } : {})}
          {...(inspectorCollapsed ? { 'data-right-collapsed': '' } : {})}
        >
          <aside className="qnn-left">
            {paletteCollapsed
              ? <PaletteRail registry={registry} onExpand={() => setPaletteCollapsed(false)} />
              : <PalettePane registry={registry} onCollapse={() => setPaletteCollapsed(true)} />}
          </aside>
          <main><CanvasPane registry={registry} overId={overId} activeId={activeId} /></main>
          <aside className="qnn-right">
            {inspectorCollapsed
              ? <InspectorRailSlot onExpand={() => setInspectorCollapsed(false)} />
              : <PropertiesPane registry={registry} onCollapse={() => setInspectorCollapsed(true)} />}
          </aside>
        </div>
      </div>
    </DndContext>
  );
}

export function QuestionnaireDesigner({ initial, plugins = [], onChange, onExport }: QuestionnaireDesignerProps) {
  const [store] = useState<DesignerStore>(() => createDesignerStore(initial ?? makeEmptyQuestionnaire()));
  const registry = useMemo(() => {
    const r = defaultRegistry.clone();
    for (const p of plugins) r.override(p);
    return r;
  }, [plugins]);

  if (onChange) {
    // naive: fire on every change. Subscribers can debounce.
    store.subscribe((s) => onChange(s.questionnaire));
  }

  return (
    <DesignerStoreContext.Provider value={store}>
      {onExport
        ? <DesignerShell registry={registry} onExport={onExport} />
        : <DesignerShell registry={registry} />}
    </DesignerStoreContext.Provider>
  );
}
