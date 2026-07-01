import { useEffect, useRef, useState } from 'react';
import { VideoCameraOutlined } from '@ant-design/icons';
import { Alert, Button, Form, InputNumber, Radio, Select, Space, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export type VideoMime = 'auto' | 'video/webm' | 'video/webm;codecs=vp9' | 'video/webm;codecs=vp8' | 'video/mp4';

export interface VideoProps {
  maxWidth: number;
  maxHeight: number;
  maxDurationSec: number;
  bitrateKbps: number;
  mimeType: VideoMime;
  facingMode: 'environment' | 'user';
  audio: boolean;
}

interface VideoValue {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  durationSec: number;
  width: number;
  height: number;
}

function isVideoValue(v: unknown): v is VideoValue {
  return !!v && typeof v === 'object'
    && typeof (v as VideoValue).dataUrl === 'string'
    && typeof (v as VideoValue).size === 'number';
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function pickSupportedMime(requested: VideoMime): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = requested === 'auto'
    ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    : [requested];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function Capture({
  props,
  onResult,
  onCancel,
}: {
  props: VideoProps;
  onResult: (v: VideoValue) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const stopTimerRef = useRef<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: props.facingMode,
            width: { ideal: props.maxWidth },
            height: { ideal: props.maxHeight },
          },
          audio: props.audio,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Unable to access camera.');
      }
    })();
    return () => {
      cancelled = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [props.facingMode, props.maxWidth, props.maxHeight, props.audio]);

  const start = () => {
    if (!streamRef.current) return;
    const mime = pickSupportedMime(props.mimeType);
    if (!mime) {
      setErr('No supported video recording MIME type in this browser.');
      return;
    }
    try {
      const rec = new MediaRecorder(streamRef.current, {
        mimeType: mime,
        videoBitsPerSecond: props.bitrateKbps * 1000,
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
        const track = streamRef.current?.getVideoTracks()[0];
        const settings = track?.getSettings();
        onResult({
          name: `video-${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`,
          size: blob.size,
          type: mime,
          dataUrl,
          durationSec,
          width: settings?.width ?? props.maxWidth,
          height: settings?.height ?? props.maxHeight,
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
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {err
        ? <Alert type="error" message={err} showIcon />
        : <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 320, background: '#000', borderRadius: 4 }} />}
      <Space>
        {!recording
          ? <Button type="primary" icon={<VideoCameraOutlined />} onClick={start} disabled={!!err}>Record</Button>
          : <Button danger onClick={stop}>Stop ({elapsed.toFixed(1)}s / {props.maxDurationSec}s)</Button>}
        <Button size="small" onClick={onCancel} disabled={recording}>Cancel</Button>
      </Space>
    </Space>
  );
}

const videoPlugin: ControlPlugin<VideoProps> = {
  type: 'video',
  category: 'input',
  group: 'device',
  label: 'Video capture',
  icon: <VideoCameraOutlined />,
  description: 'Record a video with the device camera; encoded in-browser at configured bitrate.',
  isAnswerable: true,

  defaultProps: () => ({
    maxWidth: 1280, maxHeight: 720, maxDurationSec: 15, bitrateKbps: 1500,
    mimeType: 'auto', facingMode: 'environment', audio: true,
  }),
  defaultNode: () => ({
    type: 'video',
    friendlyName: 'Video',
    required: false,
    layout: { span: 6 },
    props: {
      maxWidth: 1280, maxHeight: 720, maxDurationSec: 15, bitrateKbps: 1500,
      mimeType: 'auto', facingMode: 'environment', audio: true,
    },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <div>
        <Button icon={<VideoCameraOutlined />} disabled>Record</Button>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {node.props.maxWidth}×{node.props.maxHeight} · {node.props.bitrateKbps} kbps · ≤{node.props.maxDurationSec}s
      </Typography.Text>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const update = (patch: Partial<VideoProps>) => onChange({ props: { ...node.props, ...patch } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Camera">
          <Radio.Group value={node.props.facingMode} onChange={(e) => update({ facingMode: e.target.value })}>
            <Radio.Button value="environment">Rear</Radio.Button>
            <Radio.Button value="user">Front</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Record audio">
          <Switch checked={node.props.audio} onChange={(v) => update({ audio: v })} />
        </Form.Item>
        <Form.Item label="Container / codec">
          <Select
            value={node.props.mimeType}
            onChange={(v) => update({ mimeType: v as VideoMime })}
            options={[
              { label: 'Auto (best supported)', value: 'auto' },
              { label: 'WebM', value: 'video/webm' },
              { label: 'WebM + VP9', value: 'video/webm;codecs=vp9' },
              { label: 'WebM + VP8', value: 'video/webm;codecs=vp8' },
              { label: 'MP4', value: 'video/mp4' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Max width (px)">
          <InputNumber
            min={64} max={3840}
            value={node.props.maxWidth}
            onChange={(v) => update({ maxWidth: Math.max(64, Math.min(3840, Number(v) || 1280)) })}
          />
        </Form.Item>
        <Form.Item label="Max height (px)">
          <InputNumber
            min={64} max={2160}
            value={node.props.maxHeight}
            onChange={(v) => update({ maxHeight: Math.max(64, Math.min(2160, Number(v) || 720)) })}
          />
        </Form.Item>
        <Form.Item label="Bitrate (kbps)">
          <InputNumber
            min={100} max={20000} step={100}
            value={node.props.bitrateKbps}
            onChange={(v) => update({ bitrateKbps: Math.max(100, Math.min(20000, Number(v) || 1500)) })}
          />
        </Form.Item>
        <Form.Item label="Max duration (seconds)">
          <InputNumber
            min={1} max={600}
            value={node.props.maxDurationSec}
            onChange={(v) => update({ maxDurationSec: Math.max(1, Math.min(600, Number(v) || 15)) })}
          />
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, disabled }) => {
    const [capturing, setCapturing] = useState(false);
    const current = isVideoValue(value) ? value : null;
    const disabledProp = disabled ? { disabled: true as const } : {};
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {!capturing && (
          <Space>
            <Button icon={<VideoCameraOutlined />} onClick={() => setCapturing(true)} {...disabledProp}>
              {current ? 'Re-record' : 'Record video'}
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
            <video
              src={current.dataUrl}
              controls
              style={{ width: '100%', maxHeight: 240, background: '#000', borderRadius: 4 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {current.width}×{current.height} · {current.durationSec.toFixed(1)}s · {humanSize(current.size)}
            </Typography.Text>
          </Space>
        )}
      </Space>
    );
  },

  isValueEmpty: (v) => !isVideoValue(v),
};

export default videoPlugin;
