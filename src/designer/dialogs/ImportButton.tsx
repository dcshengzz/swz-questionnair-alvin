import { useRef } from 'react';
import { Button, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { importQuestionnaire } from '../../io/import';
import { useDesignerStore } from '../hooks/useDesignerStore';

export function ImportButton() {
  const store = useDesignerStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [api, ctxHolder] = message.useMessage();

  return (
    <>
      {ctxHolder}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        data-testid="topbar-import-input"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const r = importQuestionnaire(text);
          if (!r.ok) api.error(`Import failed: ${r.error}`);
          else {
            store.getState().replaceDocument(r.value);
            api.success('Imported.');
          }
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      <Button data-testid="topbar-import" icon={<ImportOutlined />} aria-label="Import" onClick={() => inputRef.current?.click()}>Import</Button>
    </>
  );
}
