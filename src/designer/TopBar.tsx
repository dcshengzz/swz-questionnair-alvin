import { useState } from 'react';
import { Button, Divider, Input, Popconfirm, Space, Tooltip } from 'antd';
import {
  ClearOutlined,
  ExportOutlined,
  EyeOutlined,
  MoonOutlined,
  RedoOutlined,
  SunOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { useDesignerStore } from './hooks/useDesignerStore';
import { useThemeMode } from './hooks/useThemeMode';
import { ExportDialog } from './dialogs/ExportDialog';
import { ImportButton } from './dialogs/ImportButton';
import { PreviewModal } from './dialogs/PreviewModal';

export function TopBar({ registry, onExport }: {
  registry: ControlRegistry;
  onExport?: (q: import('../schema/types').Questionnaire, includeLogic: boolean) => void;
}) {
  const store = useDesignerStore();
  const [themeMode, setThemeMode] = useThemeMode();
  const q = store((s) => s.questionnaire);
  const selectedPageId = store((s) => s.selection.pageId);
  const currentPageId = selectedPageId ?? q.pages[0]?.id ?? null;
  const currentPage = q.pages.find((p) => p.id === currentPageId);
  const pageHasControls = !!currentPage?.rows.some((r) => r.cols.length > 0);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <div className="qnn-topbar">
      <div className="qnn-brand" aria-label="QNN Designer">
        <div className="qnn-brand-mark" aria-hidden="true" />
        <div className="qnn-brand-text">
          <span className="qnn-brand-name">QNN Designer</span>
          <span className="qnn-brand-sub">Questionnaire builder</span>
        </div>
      </div>
      <Input
        data-testid="topbar-title"
        className="qnn-title-input"
        value={q.title}
        onChange={(e) =>
          store.getState().replaceDocument({
            ...q,
            title: e.target.value,
            meta: { ...q.meta, updatedAt: new Date().toISOString() },
          })
        }
      />
      <div style={{ flex: 1 }} />
      <Space size={6}>
        <Tooltip title="Undo (⌘Z)">
          <Button
            data-testid="topbar-undo"
            icon={<UndoOutlined />}
            onClick={() => store.getState().undo()}
            aria-label="Undo"
          />
        </Tooltip>
        <Tooltip title="Redo (⇧⌘Z)">
          <Button
            data-testid="topbar-redo"
            icon={<RedoOutlined />}
            onClick={() => store.getState().redo()}
            aria-label="Redo"
          />
        </Tooltip>
      </Space>
      <Divider type="vertical" style={{ height: 28 }} />
      <Space size={6}>
        <Tooltip title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Button
            data-testid="topbar-theme"
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          />
        </Tooltip>
        <Popconfirm
          title="Clear this page?"
          description="All controls on the current page will be removed. This can be undone."
          okText="Clear"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          onConfirm={() => {
            if (currentPageId) store.getState().clearPage(currentPageId);
          }}
          disabled={!currentPageId || !pageHasControls}
        >
          <Tooltip title={pageHasControls ? 'Clear all controls on this page' : 'Page is already empty'}>
            <Button
              data-testid="topbar-clear-page"
              aria-label="Clear page"
              icon={<ClearOutlined />}
              disabled={!currentPageId || !pageHasControls}
            >
              Clear
            </Button>
          </Tooltip>
        </Popconfirm>
        <ImportButton />
        <Button
          data-testid="topbar-export"
          aria-label="Download questionnaire JSON"
          icon={<ExportOutlined />}
          onClick={() => setExportOpen(true)}
        >
          Export
        </Button>
        <Button
          data-testid="topbar-preview"
          type="primary"
          icon={<EyeOutlined />}
          aria-label="Preview"
          onClick={() => setPreviewOpen(true)}
        >
          Preview
        </Button>
      </Space>
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        questionnaire={q}
        {...(onExport ? { onExport } : {})}
      />
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        questionnaire={q}
        registry={registry}
      />
    </div>
  );
}
