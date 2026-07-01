import { useEffect, useRef, useState } from 'react';
import { CameraOutlined } from '@ant-design/icons';
import { Alert, Button, Form, InputNumber, Radio, Select, Slider, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export type PhotoFormat = 'image/jpeg' | 'image/webp' | 'image/png';

export interface PhotoProps {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: PhotoFormat;
  facingMode: 'environment' | 'user';
}

interface PhotoValue {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  width: number;
  height: number;
}

function isPhotoValue(v: unknown): v is PhotoValue {
  return !!v && typeof v === 'object'
    && typeof (v as PhotoValue).dataUrl === 'string'
    && typeof (v as PhotoValue).size === 'number';
}

export function fitWithin(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxW / srcW, maxH / srcH);
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) };
}

export async function compressFrame(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  props: PhotoProps,
): Promise<PhotoValue> {
  const { width, height } = fitWithin(srcW, srcH, props.maxWidth, props.maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(source, 0, 0, width, height);
  const type = props.format;
  const quality = type === 'image/png' ? undefined : props.quality;
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null.'))),
      type,
      quality,
    );
  });
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error('FileReader failed.'));
    fr.readAsDataURL(blob);
  });
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
  return {
    name: `photo-${Date.now()}.${ext}`,
    size: blob.size,
    type,
    dataUrl,
    width,
    height,
  };
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Capture({
  props,
  onResult,
  onCancel,
}: {
  props: PhotoProps;
  onResult: (v: PhotoValue) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: props.facingMode },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Unable to access camera.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [props.facingMode]);

  const snap = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    try {
      const result = await compressFrame(v, v.videoWidth, v.videoHeight, props);
      onResult(result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Capture failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {err
        ? <Alert type="error" message={err} showIcon />
        : <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 320, background: '#000', borderRadius: 4 }} />}
      <Space>
        <Button type="primary" icon={<CameraOutlined />} onClick={snap} loading={busy} disabled={!!err}>
          Capture
        </Button>
        <Button size="small" onClick={onCancel}>Cancel</Button>
      </Space>
    </Space>
  );
}

const photoPlugin: ControlPlugin<PhotoProps> = {
  type: 'photo',
  category: 'input',
  group: 'device',
  label: 'Photo capture',
  icon: <CameraOutlined />,
  description: 'Take a photo with the device camera; compressed on-device before upload.',
  isAnswerable: true,

  defaultProps: () => ({
    maxWidth: 1280, maxHeight: 1280, quality: 0.8, format: 'image/jpeg', facingMode: 'environment',
  }),
  defaultNode: () => ({
    type: 'photo',
    friendlyName: 'Photo',
    required: false,
    layout: { span: 6 },
    props: { maxWidth: 1280, maxHeight: 1280, quality: 0.8, format: 'image/jpeg', facingMode: 'environment' },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <div>
        <Button icon={<CameraOutlined />} disabled>Take photo</Button>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {node.props.maxWidth}×{node.props.maxHeight} · {node.props.format.split('/')[1]} · q{Math.round(node.props.quality * 100)}
      </Typography.Text>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const update = (patch: Partial<PhotoProps>) => onChange({ props: { ...node.props, ...patch } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Camera">
          <Radio.Group value={node.props.facingMode} onChange={(e) => update({ facingMode: e.target.value })}>
            <Radio.Button value="environment">Rear</Radio.Button>
            <Radio.Button value="user">Front</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Format">
          <Select
            value={node.props.format}
            onChange={(v) => update({ format: v as PhotoFormat })}
            options={[
              { label: 'JPEG (smaller, lossy)', value: 'image/jpeg' },
              { label: 'WebP (smaller, lossy)', value: 'image/webp' },
              { label: 'PNG (lossless, larger)', value: 'image/png' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Max width (px)">
          <InputNumber
            min={64} max={8192}
            value={node.props.maxWidth}
            onChange={(v) => update({ maxWidth: Math.max(64, Math.min(8192, Number(v) || 1280)) })}
          />
        </Form.Item>
        <Form.Item label="Max height (px)">
          <InputNumber
            min={64} max={8192}
            value={node.props.maxHeight}
            onChange={(v) => update({ maxHeight: Math.max(64, Math.min(8192, Number(v) || 1280)) })}
          />
        </Form.Item>
        {node.props.format !== 'image/png' && (
          <Form.Item label={`Quality (${Math.round(node.props.quality * 100)}%)`}>
            <Slider
              min={10} max={100}
              value={Math.round(node.props.quality * 100)}
              onChange={(v) => update({ quality: Math.max(0.1, Math.min(1, Number(v) / 100)) })}
            />
          </Form.Item>
        )}
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, disabled }) => {
    const [capturing, setCapturing] = useState(false);
    const current = isPhotoValue(value) ? value : null;
    const disabledProp = disabled ? { disabled: true as const } : {};
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {!capturing && (
          <Space>
            <Button icon={<CameraOutlined />} onClick={() => setCapturing(true)} {...disabledProp}>
              {current ? 'Retake' : 'Take photo'}
            </Button>
            {current && (
              <Button size="small" type="text" onClick={() => onChange(undefined)} {...disabledProp}>Clear</Button>
            )}
          </Space>
        )}
        {capturing && (
          <Capture
            props={node.props}
            onResult={(v) => { setCapturing(false); onChange(v); }}
            onCancel={() => setCapturing(false)}
          />
        )}
        {current && !capturing && (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <img
              src={current.dataUrl}
              alt={current.name}
              style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {current.width}×{current.height} · {humanSize(current.size)}
            </Typography.Text>
          </Space>
        )}
      </Space>
    );
  },

  isValueEmpty: (v) => !isPhotoValue(v),
};

export default photoPlugin;
