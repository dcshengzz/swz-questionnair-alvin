import { useEffect, useRef, useState } from 'react';
import { AudioOutlined } from '@ant-design/icons';
import { Alert, Button, Form, InputNumber, Select, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export type AudioMime =
  | 'auto'
  | 'audio/webm'
  | 'audio/webm;codecs=opus'
  | 'audio/mp4'
  | 'audio/ogg;codecs=opus';

export interface AudioProps {
  maxDurationSec: number;
  bitrateKbps: number;
  mimeType: AudioMime;
}

interface AudioValue {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  durationSec: number;
}

function isAudioValue(v: unknown): v is AudioValue {
  return !!v && typeof v === 'object'
    && typeof (v as AudioValue).dataUrl === 'string'
    && typeof (v as AudioValue).size === 'number';
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function pickSupportedMime(requested: AudioMime): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = requested === 'auto'
    ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    : [requested];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function Capture({
  props,
  onResult,
  onCancel,
}: {
  props: AudioProps;
  onResult: (v: AudioValue) => void;
  onCancel: () => void;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const stopTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Unable to access microphone.');
      }
    })();
    return () => {
      cancelled = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const start = () => {
    if (!streamRef.current) return;
    const mime = pickSupportedMime(props.mimeType);
    if (!mime) {
      setErr('No supported audio recording MIME type in this browser.');
      return;
    }
    try {
      const rec = new MediaRecorder(streamRef.current, {
        mimeType: mime,
        audioBitsPerSecond: props.bitrateKbps * 1000,
      });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const durationSec = (Date.now() - startedAtRef.current) / 1000;
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(fr.error ?? new Error('FileReader failed.'));
          fr.readAsDataURL(blob);
        });
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
        onResult({
          name: `audio-${Date.now()}.${ext}`,
          size: blob.size,
          type: mime,
          dataUrl,
          durationSec,
        });
      };
      startedAtRef.current = Date.now();
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 200);
      stopTimerRef.current = window.setTimeout(stop, props.maxDurationSec * 1000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Recorder failed to start.');
    }
  };

  const stop = () => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    if (stopTimerRef.current) { window.clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {err && <Alert type="error" message={err} showIcon />}
      <Space>
        {!recording
          ? <Button type="primary" icon={<AudioOutlined />} onClick={start} disabled={!!err}>Record</Button>
          : <Button danger onClick={stop}>Stop ({elapsed.toFixed(1)}s / {props.maxDurationSec}s)</Button>}
        <Button size="small" onClick={onCancel} disabled={recording}>Cancel</Button>
      </Space>
    </Space>
  );
}

const audioPlugin: ControlPlugin<AudioProps> = {
  type: 'audio',
  category: 'input',
  group: 'device',
  label: 'Audio recorder',
  icon: <AudioOutlined />,
  description: 'Record an audio clip with the device microphone; encoded in-browser at configured bitrate.',
  isAnswerable: true,

  defaultProps: () => ({ maxDurationSec: 30, bitrateKbps: 96, mimeType: 'auto' }),
  defaultNode: () => ({
    type: 'audio',
    friendlyName: 'Audio',
    required: false,
    layout: { span: 6 },
    props: { maxDurationSec: 30, bitrateKbps: 96, mimeType: 'auto' },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <div>
        <Button icon={<AudioOutlined />} disabled>Record</Button>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        ≤{node.props.maxDurationSec}s · {node.props.bitrateKbps} kbps
      </Typography.Text>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const update = (patch: Partial<AudioProps>) => onChange({ props: { ...node.props, ...patch } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Container / codec">
          <Select
            value={node.props.mimeType}
            onChange={(v) => update({ mimeType: v as AudioMime })}
            options={[
              { label: 'Auto (best supported)', value: 'auto' },
              { label: 'WebM', value: 'audio/webm' },
              { label: 'WebM + Opus', value: 'audio/webm;codecs=opus' },
              { label: 'Ogg + Opus', value: 'audio/ogg;codecs=opus' },
              { label: 'MP4 / AAC', value: 'audio/mp4' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Bitrate (kbps)">
          <InputNumber
            min={16} max={320} step={8}
            value={node.props.bitrateKbps}
            onChange={(v) => update({ bitrateKbps: Math.max(16, Math.min(320, Number(v) || 96)) })}
          />
        </Form.Item>
        <Form.Item label="Max duration (seconds)">
          <InputNumber
            min={1} max={600}
            value={node.props.maxDurationSec}
            onChange={(v) => update({ maxDurationSec: Math.max(1, Math.min(600, Number(v) || 30)) })}
          />
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, disabled }) => {
    const [capturing, setCapturing] = useState(false);
    const current = isAudioValue(value) ? value : null;
    const disabledProp = disabled ? { disabled: true as const } : {};
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {!capturing && (
          <Space>
            <Button icon={<AudioOutlined />} onClick={() => setCapturing(true)} {...disabledProp}>
              {current ? 'Re-record' : 'Record audio'}
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
            <audio src={current.dataUrl} controls style={{ width: '100%' }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {current.durationSec.toFixed(1)}s · {humanSize(current.size)}
            </Typography.Text>
          </Space>
        )}
      </Space>
    );
  },

  isValueEmpty: (v) => !isAudioValue(v),
};

export default audioPlugin;
