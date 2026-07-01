import { useRef, useState } from 'react';
import { AimOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, InputNumber, Space, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface ClickMapProps {
  imageUrl: string;
  /** Max number of marks the respondent can place. Undefined = unlimited. */
  maxPoints?: number;
  /** Display the running count of placed marks under the image. */
  showCount?: boolean;
}

interface ClickPoint { x: number; y: number; }

function isPointArray(v: unknown): v is ClickPoint[] {
  return Array.isArray(v)
    && v.every((p) => p && typeof p === 'object'
      && typeof (p as ClickPoint).x === 'number'
      && typeof (p as ClickPoint).y === 'number');
}

const clickMapPlugin: ControlPlugin<ClickMapProps> = {
  type: 'clickmap',
  category: 'input',
  group: 'device',
  label: 'Click map',
  icon: <AimOutlined />,
  description: 'Pin one or more spots on an image. Coordinates are stored normalized (0–1).',
  isAnswerable: true,

  defaultProps: () => ({ imageUrl: '', showCount: true }),
  defaultNode: () => ({
    type: 'clickmap',
    friendlyName: 'Click map',
    required: false,
    layout: { span: 12 },
    props: { imageUrl: '', showCount: true },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <ClickMapSurface
        imageUrl={node.props.imageUrl}
        points={[]}
        disabled
        placeholderHint="Respondents click to drop a pin."
      />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Image URL (https://… or data:image/…)">
        <Input
          value={node.props.imageUrl}
          placeholder="https://example.com/floorplan.png"
          onChange={(e) => onChange({ props: { ...node.props, imageUrl: e.target.value } })}
        />
      </Form.Item>
      <Form.Item label="Max pins (blank = unlimited)">
        <InputNumber
          min={1}
          value={node.props.maxPoints ?? null}
          onChange={(v) => {
            const { maxPoints: _drop, ...rest } = node.props;
            onChange({ props: v == null ? rest : { ...rest, maxPoints: Number(v) } });
          }}
        />
      </Form.Item>
      <Form.Item label="Show pin count">
        <Switch
          checked={node.props.showCount !== false}
          onChange={(v) => onChange({ props: { ...node.props, showCount: v } })}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, disabled, error }) => {
    const points = isPointArray(value) ? value : [];
    const max = node.props.maxPoints;

    const addPoint = (p: ClickPoint) => {
      if (disabled) return;
      if (max != null && points.length >= max) return;
      onChange([...points, p]);
    };
    const removePoint = (i: number) => {
      if (disabled) return;
      onChange(points.filter((_, j) => j !== i));
    };
    const clear = () => { if (!disabled) onChange([]); };

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <ClickMapSurface
          imageUrl={node.props.imageUrl}
          points={points}
          disabled={disabled}
          error={!!error}
          onAdd={addPoint}
          onRemove={removePoint}
        />
        <Space>
          {node.props.showCount !== false && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {points.length}{max != null ? ` / ${max}` : ''} pin{points.length === 1 ? '' : 's'}
            </Typography.Text>
          )}
          {points.length > 0 && (
            <Button size="small" onClick={clear} disabled={!!disabled}>Clear all</Button>
          )}
        </Space>
      </Space>
    );
  },

  isValueEmpty: (v) => !isPointArray(v) || v.length === 0,
};

function ClickMapSurface({
  imageUrl,
  points,
  disabled,
  error,
  onAdd,
  onRemove,
  placeholderHint,
}: {
  imageUrl: string;
  points: ClickPoint[];
  disabled?: boolean | undefined;
  error?: boolean | undefined;
  onAdd?: (p: ClickPoint) => void;
  onRemove?: (i: number) => void;
  placeholderHint?: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!onAdd || disabled) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onAdd({ x, y });
  };

  if (!imageUrl) {
    return (
      <Alert
        type="info"
        showIcon
        message="No image configured."
        description="Set an Image URL in the Properties pane."
      />
    );
  }

  return (
    <div
      ref={surfaceRef}
      className="qnn-clickmap-surface"
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth: '100%',
        cursor: disabled || !onAdd ? 'default' : 'crosshair',
        border: `1px solid ${error ? '#ff4d4f' : 'var(--qnn-hairline)'}`,
        borderRadius: 4,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {imgError ? (
        <Alert type="error" showIcon message={`Failed to load image: ${imageUrl}`} />
      ) : (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onError={() => setImgError(true)}
          style={{ display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none' }}
        />
      )}
      {points.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Pin ${i + 1} (click to remove)`}
          onClick={(e) => { e.stopPropagation(); onRemove?.(i); }}
          disabled={!!disabled || !onRemove}
          style={{
            position: 'absolute',
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(220, 38, 38, 0.85)',
            border: '2px solid white',
            color: 'white',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1,
            padding: 0,
            cursor: disabled ? 'default' : 'pointer',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          }}
        >
          {i + 1}
        </button>
      ))}
      {placeholderHint && points.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 8,
            pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent 40%)',
            color: 'white',
            fontSize: 12,
          }}
        >
          {placeholderHint}
        </div>
      )}
    </div>
  );
}

export default clickMapPlugin;
