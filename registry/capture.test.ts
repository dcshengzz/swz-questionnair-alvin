import { describe, it, expect, vi } from 'vitest';
import { fitWithin } from '../../src/registry/controls/photo';
import { pickSupportedMime } from '../../src/registry/controls/video';

describe('photo fitWithin', () => {
  it('scales down preserving aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1280, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280, 1280)).toEqual({ width: 960, height: 1280 });
  });
  it('does not upscale smaller sources', () => {
    expect(fitWithin(640, 480, 1920, 1080)).toEqual({ width: 640, height: 480 });
  });
  it('returns zero for zero-sized source', () => {
    expect(fitWithin(0, 0, 1280, 1280)).toEqual({ width: 0, height: 0 });
  });
});

describe('video pickSupportedMime', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  it('returns the first supported candidate for auto', () => {
    const original = g.MediaRecorder;
    g.MediaRecorder = {
      isTypeSupported: vi.fn((t: string) => t === 'video/webm;codecs=vp8' || t === 'video/webm'),
    };
    expect(pickSupportedMime('auto')).toBe('video/webm;codecs=vp8');
    g.MediaRecorder = original;
  });
  it('returns undefined when nothing is supported', () => {
    const original = g.MediaRecorder;
    g.MediaRecorder = { isTypeSupported: () => false };
    expect(pickSupportedMime('auto')).toBeUndefined();
    g.MediaRecorder = original;
  });
});
