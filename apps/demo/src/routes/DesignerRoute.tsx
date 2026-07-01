import { useState } from 'react';
import {
  QuestionnaireDesigner,
  loadDesignerDraft,
  saveDesignerDraft,
  makeEmptyQuestionnaire,
} from '@qnn/designer';
import type { Questionnaire } from '@qnn/designer';
import { Alert, Button, Space } from 'antd';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export default function DesignerRoute() {
  const [restored, setRestored] = useState<string | null>(() => {
    const q = loadDesignerDraft();
    return q?.meta.updatedAt ?? null;
  });
  const [initial] = useState<Questionnaire>(() => loadDesignerDraft() ?? makeEmptyQuestionnaire());

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {restored && (
        <Alert
          type="info"
          showIcon
          message={`Restored unsaved work from ${new Date(restored).toLocaleString()}`}
          action={
            <Space>
              <Button size="small" onClick={() => { localStorage.removeItem('qnn.designer.draft.v1'); location.reload(); }}>Discard</Button>
              <Button size="small" onClick={() => setRestored(null)}>Dismiss</Button>
            </Space>
          }
        />
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuestionnaireDesigner
          initial={initial}
          onChange={(q) => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => saveDesignerDraft(q), 300);
          }}
        />
      </div>
    </div>
  );
}
