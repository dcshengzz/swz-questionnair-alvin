import { PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Switch, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface FileUploadProps {
  accept?: string;
  maxSizeMb?: number;
  multiple: boolean;
}

interface FileMeta {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

function toFileMetaList(v: unknown): FileMeta[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is FileMeta => !!x && typeof x === 'object' && typeof (x as FileMeta).name === 'string');
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const fileUploadPlugin: ControlPlugin<FileUploadProps> = {
  type: 'fileupload',
  category: 'input',
  group: 'basic',
  label: 'File upload',
  icon: <PaperClipOutlined />,
  description: 'Collect one or more file attachments.',
  isAnswerable: true,

  defaultProps: () => ({ multiple: false }),
  defaultNode: () => ({
    type: 'fileupload',
    friendlyName: 'Attachment',
    required: false,
    layout: { span: 6 },
    props: { multiple: false },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <div>
        <Button icon={<UploadOutlined />} disabled>
          {node.props.multiple ? 'Upload files' : 'Upload file'}
        </Button>
      </div>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Allow multiple">
        <Switch
          checked={node.props.multiple}
          onChange={(v) => onChange({ props: { ...node.props, multiple: v } })}
        />
      </Form.Item>
      <Form.Item label="Accepted types (e.g. image/*, .pdf)">
        <Input
          value={node.props.accept ?? ''}
          onChange={(e) => {
            const accept = e.target.value.trim();
            const { accept: _drop, ...rest } = node.props;
            onChange({ props: accept ? { ...rest, accept } : rest });
          }}
        />
      </Form.Item>
      <Form.Item label="Max size (MB)">
        <InputNumber
          min={0}
          value={node.props.maxSizeMb ?? null}
          onChange={(v) => {
            const { maxSizeMb: _drop, ...rest } = node.props;
            onChange({ props: v == null ? rest : { ...rest, maxSizeMb: Number(v) } });
          }}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, disabled, error }) => {
    const files = toFileMetaList(value);
    const fileList: UploadFile[] = files.map((f, i) => ({
      uid: `${i}-${f.name}`,
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'done',
    }));
    const maxBytes = node.props.maxSizeMb != null ? node.props.maxSizeMb * 1024 * 1024 : null;

    const disabledProp = disabled ? { disabled: true as const } : {};
    const dangerProp = error ? { type: 'danger' as const } : {};
    return (
      <Upload
        multiple={node.props.multiple}
        {...(node.props.accept ? { accept: node.props.accept } : {})}
        {...disabledProp}
        fileList={fileList}
        beforeUpload={(file) => {
          if (maxBytes != null && file.size > maxBytes) return Upload.LIST_IGNORE;
          const meta: FileMeta = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          };
          const next = node.props.multiple ? [...files, meta] : [meta];
          onChange(next);
          return false;
        }}
        onRemove={(file) => {
          const next = files.filter((f, i) => `${i}-${f.name}` !== file.uid);
          onChange(next);
        }}
        itemRender={(_orig, file) => (
          <Typography.Text {...dangerProp} style={{ display: 'block' }}>
            <PaperClipOutlined /> {file.name}
            {typeof file.size === 'number' ? ` (${humanSize(file.size)})` : ''}
          </Typography.Text>
        )}
      >
        <Button icon={<UploadOutlined />} {...disabledProp}>
          {node.props.multiple ? 'Upload files' : 'Upload file'}
        </Button>
      </Upload>
    );
  },

  validate: (node, value) => {
    const files = toFileMetaList(value);
    const { maxSizeMb } = node.props;
    if (maxSizeMb != null) {
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (files.some((f) => f.size > maxBytes)) {
        return `${node.friendlyName} has a file exceeding ${maxSizeMb} MB.`;
      }
    }
    return null;
  },

  isValueEmpty: (v) => toFileMetaList(v).length === 0,
};

export default fileUploadPlugin;
