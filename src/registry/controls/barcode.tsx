import { useEffect, useRef, useState } from 'react';
import { QrcodeOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Form, Radio, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export const BARCODE_FORMATS = [
  'qr_code', 'code_128', 'code_39', 'code_93', 'codabar',
  'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf',
  'pdf417', 'data_matrix', 'aztec',
] as const;
export type BarcodeFormat = typeof BARCODE_FORMATS[number];

export interface BarcodeProps {
  formats: BarcodeFormat[];
  facingMode: 'environment' | 'user';
}

interface BarcodeValue {
  text: string;
  format: string;
  capturedAt: string;
}

function isBarcodeValue(v: unknown): v is BarcodeValue {
  return !!v && typeof v === 'object'
    && typeof (v as BarcodeValue).text === 'string'
    && typeof (v as BarcodeValue).format === 'string';
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string; format: string }[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => BarcodeDetectorLike;

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

function Scanner({
  props,
  onResult,
  onCancel,
}: {
  props: BarcodeProps;
  onResult: (v: BarcodeValue) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const Ctor = getDetectorCtor();
    if (!Ctor) {
      setErr('BarcodeDetector API is not available in this browser.');
      return;
    }
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    const detector = new Ctor({ formats: props.formats });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: props.facingMode },
          audio: false,
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const hits = await detector.detect(videoRef.current);
            const hit = hits[0];
            if (hit) {
              onResult({
                text: hit.rawValue,
                format: hit.format,
                capturedAt: new Date().toISOString(),
              });
              return;
            }
          } catch {
            // Detection errors are transient; keep scanning.
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Unable to access camera.');
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [props.facingMode, props.formats, onResult]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {err ? (
        <Alert type="error" message={err} showIcon />
      ) : (
        <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 320, background: '#000', borderRadius: 4 }} />
      )}
      <Button size="small" onClick={onCancel}>Cancel</Button>
    </Space>
  );
}

const barcodePlugin: ControlPlugin<BarcodeProps> = {
  type: 'barcode',
  category: 'input',
  group: 'device',
  label: 'Barcode / QR',
  icon: <QrcodeOutlined />,
  description: 'Scan a QR code or barcode with the device camera.',
  isAnswerable: true,

  defaultProps: () => ({ formats: ['qr_code', 'code_128', 'ean_13'], facingMode: 'environment' }),
  defaultNode: () => ({
    type: 'barcode',
    friendlyName: 'Scan code',
    required: false,
    layout: { span: 6 },
    props: { formats: ['qr_code', 'code_128', 'ean_13'], facingMode: 'environment' },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <div>
        <Button icon={<QrcodeOutlined />} disabled>Scan</Button>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {node.props.formats.length} format{node.props.formats.length === 1 ? '' : 's'}
      </Typography.Text>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Camera">
        <Radio.Group
          value={node.props.facingMode}
          onChange={(e) => onChange({ props: { ...node.props, facingMode: e.target.value } })}
        >
          <Radio.Button value="environment">Rear</Radio.Button>
          <Radio.Button value="user">Front</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item label="Accepted formats">
        <Checkbox.Group
          value={node.props.formats}
          onChange={(v) => onChange({ props: { ...node.props, formats: v as BarcodeFormat[] } })}
          options={BARCODE_FORMATS.map((f) => ({ label: f.replace(/_/g, ' '), value: f }))}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, disabled }) => {
    const [scanning, setScanning] = useState(false);
    const current = isBarcodeValue(value) ? value : null;
    const disabledProp = disabled ? { disabled: true as const } : {};
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {!scanning && (
          <Space>
            <Button icon={<QrcodeOutlined />} onClick={() => setScanning(true)} {...disabledProp}>
              {current ? 'Rescan' : 'Scan code'}
            </Button>
            {current && (
              <Button size="small" type="text" onClick={() => onChange(undefined)} {...disabledProp}>Clear</Button>
            )}
          </Space>
        )}
        {scanning && (
          <Scanner
            props={node.props}
            onResult={(v) => { setScanning(false); onChange(v); }}
            onCancel={() => setScanning(false)}
          />
        )}
        {current && !scanning && (
          <Typography.Text code>{current.format}: {current.text}</Typography.Text>
        )}
      </Space>
    );
  },

  isValueEmpty: (v) => !isBarcodeValue(v),
};

export default barcodePlugin;
