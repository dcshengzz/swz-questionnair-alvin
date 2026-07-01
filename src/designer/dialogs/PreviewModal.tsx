import { Modal } from 'antd';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { Questionnaire } from '../../schema/types';
import { QuestionnaireRenderer } from '../../runtime/Renderer';

export function PreviewModal({ open, onClose, questionnaire, registry }: {
  open: boolean; onClose: () => void; questionnaire: Questionnaire; registry: ControlRegistry;
}) {
  return (
    <Modal open={open} onCancel={onClose} title="Preview" footer={null} width={880} destroyOnClose>
      <QuestionnaireRenderer
        questionnaire={questionnaire}
        plugins={registry.all()}
        persistDraft={false}
        onSubmit={(answers) => {
          Modal.info({ title: 'Submitted', content: <pre>{JSON.stringify(answers, null, 2)}</pre>, width: 680 });
          onClose();
        }}
      />
    </Modal>
  );
}
