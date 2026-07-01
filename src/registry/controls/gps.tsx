import { useState } from 'react';
import { EnvironmentOutlined } from '@ant-design/icons';
import { Alert, Button, Form, InputNumber, Space, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface GpsProps {
  precision: number;
  enableHighAccuracy: boolean;
}

interface GpsValue {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt?: string;
}

function isGpsValue(v: unknown): v is GpsValue {
  return !!v && typeof v === 'object'
    && typeof (v as GpsValue).lat === 'number'
    && typeof (v as GpsValue).lng === 'number';
}

function formatCoord(n: number, precision: number): string {
  const p = Math.max(0, Math.min(10, precision));
  return n.toFixed(p);
}

const gpsPlugin: ControlPlugin<GpsProps> = {
  type: 'gps',
  category: 'input',
  group: 'device',
  label: 'GPS location',
  icon: <EnvironmentOutlined />,
  description: 'Capture latitude/longitude from the browser geolocation API.',
  isAnswerable: true,

  defaultProps: () => ({ precision: 6, enableHighAccuracy: true }),
  defaultNode: () => ({
    type: 'gps',
    friendlyName: 'Location',
    required: false,
    layout: { span: 6 },
    props: { precision: 6, enableHighAccuracy: true },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <div>
        <Button icon={<EnvironmentOutlined />} disabled>Get location</Button>
      </div>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Coordinate precision (decimals)">
        <InputNumber
          min={0}
          max={10}
          value={node.props.precision}
          onChange={(v) => onChange({ props: { ...node.props, precision: Math.min(10, Math.max(0, Number(v) || 0)) } })}
        />
      </Form.Item>
      <Form.Item label="High accuracy">
        <Switch
          checked={node.props.enableHighAccuracy}
          onChange={(v) => onChange({ props: { ...node.props, enableHighAccuracy: v } })}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, disabled }) => {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const current = isGpsValue(value) ? value : null;

    const capture = () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setErr('Geolocation is not available in this environment.');
        return;
      }
      setBusy(true);
      setErr(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBusy(false);
          onChange({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          } satisfies GpsValue);
        },
        (e) => {
          setBusy(false);
          setErr(e.message || 'Failed to acquire location.');
        },
        { enableHighAccuracy: node.props.enableHighAccuracy, timeout: 15000 },
      );
    };

    const disabledProp = disabled ? { disabled: true as const } : {};
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button
            icon={<EnvironmentOutlined />}
            onClick={capture}
            loading={busy}
            {...disabledProp}
          >
            {current ? 'Update location' : 'Get location'}
          </Button>
          {current && (
            <Button size="small" type="text" onClick={() => onChange(undefined)} {...disabledProp}>
              Clear
            </Button>
          )}
        </Space>
        {current && (
          <Typography.Text code>
            {formatCoord(current.lat, node.props.precision)}, {formatCoord(current.lng, node.props.precision)}
            {typeof current.accuracy === 'number' ? ` (±${Math.round(current.accuracy)}m)` : ''}
          </Typography.Text>
        )}
        {err && <Alert type="error" message={err} showIcon />}
      </Space>
    );
  },

  isValueEmpty: (v) => !isGpsValue(v),
};

export default gpsPlugin;
