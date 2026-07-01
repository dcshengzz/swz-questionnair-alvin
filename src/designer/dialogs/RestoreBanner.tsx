import { Alert, Button } from 'antd';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { clearDesignerDraft } from '../../io/persistence';

export function RestoreBanner({ timestamp, onDismiss }: { timestamp: string; onDismiss: () => void }) {
  return (
    <Alert
      type="info"
      showIcon
      message={`Restored unsaved work from ${new Date(timestamp).toLocaleString()}`}
      action={
        <Button size="small" onClick={() => { clearDesignerDraft(); onDismiss(); location.reload(); }}>
          Discard
        </Button>
      }
    />
  );
}
