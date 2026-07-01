import { Button, Space } from 'antd';

export function PageNavigation({
  canPrev, isLast, onPrev, onNext,
}: { canPrev: boolean; isLast: boolean; onPrev: () => void; onNext: () => void }) {
  return (
    <Space style={{ marginTop: 24 }}>
      <Button data-testid="runtime-prev" disabled={!canPrev} onClick={onPrev}>Previous</Button>
      <Button data-testid="runtime-next" type="primary" onClick={onNext}>{isLast ? 'Submit' : 'Next'}</Button>
    </Space>
  );
}
