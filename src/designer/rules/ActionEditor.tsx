import { Button, Input, Select, Space } from 'antd';
import type { Action, Page } from '../../schema/types';

export function ActionEditor({
  value, onChange, onRemove, aliases, pages,
}: {
  value: Action; onChange: (a: Action) => void; onRemove: () => void;
  aliases: string[]; pages: Page[];
}) {
  return (
    <Space.Compact block>
      <Select
        virtual={false}
        style={{ width: 130 }}
        value={value.kind}
        options={[
          { value: 'show', label: 'Show' },
          { value: 'hide', label: 'Hide' },
          { value: 'require', label: 'Require' },
          { value: 'unrequire', label: 'Unrequire' },
          { value: 'gotoPage', label: 'Go to page' },
          { value: 'skipPage', label: 'Skip page' },
          { value: 'fail', label: 'Fail' },
        ]}
        onChange={(kind) => {
          if (kind === 'gotoPage' || kind === 'skipPage') onChange({ kind, pageId: pages[0]?.id ?? '' });
          else if (kind === 'fail') onChange({ kind: 'fail', message: 'Error' });
          else onChange({ kind: kind as 'show', target: { alias: aliases[0] ?? '' } });
        }}
      />
      {(value.kind === 'show' || value.kind === 'hide') && (
        <Select
          virtual={false}
          style={{ width: 200 }}
          value={'alias' in value.target ? `a:${value.target.alias}` : `p:${value.target.pageId}`}
          options={[
            ...aliases.map((a) => ({ value: `a:${a}`, label: `field: ${a}` })),
            ...pages.map((p) => ({ value: `p:${p.id}`, label: `page: ${p.name}` })),
          ]}
          onChange={(key) => {
            const [kind, rest] = [key.charAt(0), key.slice(2)];
            onChange({ kind: value.kind, target: kind === 'a' ? { alias: rest } : { pageId: rest } });
          }}
        />
      )}
      {(value.kind === 'require' || value.kind === 'unrequire') && (
        <Select
          virtual={false}
          style={{ width: 180 }}
          value={value.target.alias}
          options={aliases.map((a) => ({ value: a, label: a }))}
          onChange={(alias) => onChange({ kind: value.kind, target: { alias } })}
        />
      )}
      {(value.kind === 'gotoPage' || value.kind === 'skipPage') && (
        <Select
          virtual={false}
          style={{ width: 200 }}
          value={value.pageId}
          options={pages.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(pageId) => onChange({ kind: value.kind, pageId })}
        />
      )}
      {value.kind === 'fail' && (
        <>
          <Select
            virtual={false}
            style={{ width: 180 }}
            allowClear
            placeholder="scope (alias)"
            value={value.target?.alias}
            options={aliases.map((a) => ({ value: a, label: a }))}
            onChange={(alias) => onChange(alias ? { kind: 'fail', target: { alias }, message: value.message } : { kind: 'fail', message: value.message })}
          />
          <Input
            style={{ width: 240 }}
            placeholder="message"
            value={value.message}
            onChange={(e) => onChange({ ...value, message: e.target.value })}
          />
        </>
      )}
      <Button onClick={onRemove}>×</Button>
    </Space.Compact>
  );
}
