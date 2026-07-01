import { Button, Card, Input, Space } from 'antd';
import type { Action, Rule } from '../../schema/types';
import { ExprEditor } from './ExprEditor';
import { ActionEditor } from './ActionEditor';
import type { Page } from '../../schema/types';

export function RuleCard({
  rule, onChange, onRemove, aliases, pages,
}: {
  rule: Rule; onChange: (r: Rule) => void; onRemove: () => void;
  aliases: string[]; pages: Page[];
}) {
  const setThen = (then: Action[]) => onChange({ ...rule, then });
  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Input
          variant="borderless"
          placeholder="Rule name (optional)"
          value={rule.name ?? ''}
          onChange={(e) => {
              const v = e.target.value;
              if (v) {
                onChange({ ...rule, name: v });
              } else {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { name: _n, ...rest } = rule;
                onChange(rest);
              }
            }}
        />
      }
      extra={<Button onClick={onRemove}>Delete</Button>}
    >
      <div style={{ marginBottom: 8 }}><strong>WHEN</strong></div>
      <ExprEditor value={rule.when} onChange={(e) => onChange({ ...rule, when: e })} aliases={aliases} />
      <div style={{ margin: '12px 0 8px' }}><strong>THEN</strong></div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {rule.then.map((a, i) => (
          <ActionEditor
            key={i}
            value={a}
            onChange={(next) => setThen(rule.then.map((x, j) => j === i ? next : x))}
            onRemove={() => setThen(rule.then.filter((_, j) => j !== i))}
            aliases={aliases}
            pages={pages}
          />
        ))}
        <Button onClick={() => setThen([...rule.then, { kind: 'hide', target: { alias: aliases[0] ?? '' } }])}>
          + Add action
        </Button>
      </Space>
    </Card>
  );
}
