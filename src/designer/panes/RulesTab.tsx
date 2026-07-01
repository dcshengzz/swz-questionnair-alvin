import { Button, Space, Typography } from 'antd';
import { newId } from '../../util/ids';
import type { Rule } from '../../schema/types';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { RuleCard } from '../rules/RuleCard';

export function RulesTab() {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const aliases: string[] = [];
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) aliases.push(c.alias);

  const setRules = (rules: Rule[]) => {
    store.getState().replaceDocument({ ...q, rules, meta: { ...q.meta, updatedAt: new Date().toISOString() } });
  };

  const addRule = () => {
    const r: Rule = {
      id: newId(),
      when: { op: 'and', args: [] },
      then: [],
    };
    setRules([...q.rules, r]);
  };

  return (
    <div>
      <Typography.Paragraph type="secondary">
        Rules evaluate in document order. Later rules override earlier on the same target.
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: '100%' }}>
        {q.rules.map((r, i) => (
          <RuleCard
            key={r.id}
            rule={r}
            onChange={(next) => setRules(q.rules.map((x, j) => j === i ? next : x))}
            onRemove={() => setRules(q.rules.filter((_, j) => j !== i))}
            aliases={aliases}
            pages={q.pages}
          />
        ))}
        <Button type="primary" onClick={addRule}>+ Add rule</Button>
      </Space>
    </div>
  );
}
