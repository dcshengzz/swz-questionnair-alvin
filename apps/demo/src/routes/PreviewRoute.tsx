import { useState } from 'react';
import { Alert, Modal } from 'antd';
import { QuestionnaireRenderer, loadDesignerDraft } from '@qnn/designer';
import type { Questionnaire } from '@qnn/designer';

export default function PreviewRoute() {
  const [q] = useState<Questionnaire | null>(() => loadDesignerDraft());
  if (!q) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="warning" message="No designer draft found. Design a questionnaire first." showIcon />
      </div>
    );
  }
  return (
    <QuestionnaireRenderer
      questionnaire={q}
      onSubmit={(answers) => {
        Modal.info({
          title: 'Submitted',
          content: <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(answers, null, 2)}</pre>,
          width: 720,
        });
      }}
    />
  );
}
