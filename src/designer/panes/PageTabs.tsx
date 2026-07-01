import { useState } from 'react';
import { Button, Input, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDesignerStore } from '../hooks/useDesignerStore';
import type { PageId } from '../../schema/types';

interface PageTabItemProps {
  id: PageId;
  name: string;
  active: boolean;
  canDelete: boolean;
  isEditing: boolean;
  draft: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onDraftChange: (v: string) => void;
  onCommitEdit: () => void;
  onDelete: () => void;
}

function PageTabItem({
  id,
  name,
  active,
  canDelete,
  isEditing,
  draft,
  onSelect,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onDelete,
}: PageTabItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`qnn-pagetab${active ? ' qnn-active' : ''}${isDragging ? ' qnn-dragging' : ''}`}
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onStartEdit}
    >
      {isEditing ? (
        <Input
          autoFocus
          size="small"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onCommitEdit}
          onPressEnter={onCommitEdit}
          style={{ width: 140 }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <Tooltip title="Drag to reorder">
            <span
              className="qnn-pagetab-drag"
              aria-label={`Drag ${name}`}
              data-testid={`pagetab-drag-${id}`}
              onClick={(e) => e.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <HolderOutlined />
            </span>
          </Tooltip>
          <span aria-label={name} data-page-tab-name={name}>
            {name}
          </span>
          <Tooltip title="Rename page">
            <span
              className="qnn-pagetab-edit"
              role="button"
              aria-label={`Rename ${name}`}
              data-testid={`pagetab-edit-${id}`}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onStartEdit();
                }
              }}
            >
              <EditOutlined />
            </span>
          </Tooltip>
          {canDelete && (
            <Popconfirm title={`Delete ${name}?`} onConfirm={onDelete}>
              <span
                className="qnn-pagetab-close"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Delete ${name}`}
              >
                ×
              </span>
            </Popconfirm>
          )}
        </>
      )}
    </div>
  );
}

export function PageTabs() {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const selectedPageId = store((s) => s.selection.pageId) ?? q.pages[0]?.id;
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = q.pages.map((p) => p.id);
    const from = ids.indexOf(String(active.id) as PageId);
    const to = ids.indexOf(String(over.id) as PageId);
    if (from < 0 || to < 0) return;
    store.getState().reorderPages(arrayMove(ids, from, to));
  };

  const commitEdit = (pageId: PageId, fallback: string) => {
    store.getState().renamePage(pageId, draft || fallback);
    setEditing(null);
  };

  return (
    <div className="qnn-pagetabs">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={q.pages.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
          {q.pages.map((p) => (
            <PageTabItem
              key={p.id}
              id={p.id}
              name={p.name}
              active={p.id === selectedPageId}
              canDelete={q.pages.length > 1}
              isEditing={editing === p.id}
              draft={draft}
              onSelect={() => store.getState().selectPage(p.id)}
              onStartEdit={() => {
                setEditing(p.id);
                setDraft(p.name);
              }}
              onDraftChange={setDraft}
              onCommitEdit={() => commitEdit(p.id, p.name)}
              onDelete={() => store.getState().deletePage(p.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        className="qnn-addpage"
        icon={<PlusOutlined />}
        size="small"
        type="text"
        onClick={() => store.getState().addPage()}
      >
        Page
      </Button>
    </div>
  );
}
