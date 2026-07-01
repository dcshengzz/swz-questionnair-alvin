import { useState } from 'react';
import { Button, Checkbox, Input, Modal } from 'antd';
import type { Questionnaire } from '../../schema/types';
import { exportQuestionnaire } from '../../io/export';

export function ExportDialog({ open, onClose, questionnaire, onExport }: {
  open: boolean; onClose: () => void; questionnaire: Questionnaire;
  onExport?: (q: Questionnaire, includeLogic: boolean) => void;
}) {
  const [includeLogic, setIncludeLogic] = useState(true);
  const [fileName, setFileName] = useState(`${questionnaire.title.replace(/\s+/g, '-').toLowerCase() || 'questionnaire'}.json`);

  const handleExport = () => {
    const doc = exportQuestionnaire(questionnaire, { includeLogic });
    if (onExport) onExport(doc, includeLogic);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Modal open={open} onCancel={onClose} title="Export questionnaire" footer={null} destroyOnClose>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label>File name</label>
          <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
        </div>
        <Checkbox checked={includeLogic} onChange={(e) => setIncludeLogic(e.target.checked)}>
          Include logic rules (validation + branching)
        </Checkbox>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleExport}>Export</Button>
        </div>
      </div>
    </Modal>
  );
}
