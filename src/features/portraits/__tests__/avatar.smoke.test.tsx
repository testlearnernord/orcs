import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OfficerAvatar } from '../Avatar';
import { resetPortraitAtlasCache } from '../portrait-atlas';

type ImageCtor = typeof Image;

type ToBlob = HTMLCanvasElement['toBlob'];

type ToDataURL = HTMLCanvasElement['toDataURL'];
=======

const originalImage: ImageCtor | undefined = global.Image;
const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob: ToBlob | undefined = HTMLCanvasElement.prototype.toBlob;
const originalToDataURL: ToDataURL | undefined =
  HTMLCanvasElement.prototype.toDataURL;

let failLoads = false;
let objectUrlCounter = 0;

class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  decoding = 'async';
  naturalWidth = 1024;
  naturalHeight = 1536;
  private _src = '';

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (failLoads) {
        this.onerror?.(new Error('fail'));
      } else {
        this.onload?.();
      }
    });
  }

  get src(): string {
    return this._src;
  }
}

function createMockContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  return {
    canvas,
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  } as unknown as CanvasRenderingContext2D;
}

function setupCanvasMocks() {
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    contextId?: string
  ) {
    if (!contextId || contextId === '2d') {
      return createMockContext(this);
    }
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function toBlob(
    callback: BlobCallback,
    type?: string
  ) {
    const blob = new Blob(['mock'], { type: type ?? 'image/png' });
    callback(blob);
  };

  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,AAAA'
  );
}

function restoreCanvasMocks() {
  if (originalGetContext) {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  }
  if (originalToBlob) {
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  } else {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).toBlob;
  }
  if (originalToDataURL) {
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  } else {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>)
      .toDataURL;
  }
}

beforeEach(() => {
  failLoads = false;
  objectUrlCounter = 0;
  (globalThis as any).__orcsPortraitStatus = undefined;
  global.Image = MockImage as unknown as ImageCtor;
  global.URL.createObjectURL = vi.fn(() => `blob:mock-${objectUrlCounter++}`);
  global.URL.revokeObjectURL = vi.fn();
  setupCanvasMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetPortraitAtlasCache();
  cleanup();
  if (originalImage) {
    global.Image = originalImage;
  } else {
    delete (globalThis as Partial<typeof globalThis>).Image;
  }
  global.URL.createObjectURL = originalCreateObjectURL;
  global.URL.revokeObjectURL = originalRevokeObjectURL;
  restoreCanvasMocks();
});

describe('OfficerAvatar', () => {
  it('renders a sliced portrait image for the officer', async () => {
    const { findByAltText } = render(<OfficerAvatar officerId="Test:1" />);
    const element = await findByAltText('Test:1');

    await waitFor(() => {
      expect(element.getAttribute('data-portrait-set')).toMatch(/set_[ab]/);
      expect(element.getAttribute('src')).toMatch(/^blob:mock-/);
      expect(element.getAttribute('data-art')).toBeNull();
      expect(element.style.backgroundImage).toMatch(/\.webp/);
      expect(element.style.backgroundSize).toMatch(/%/);
      expect(element.style.backgroundPosition).toMatch(/%/);
    });

    const status = (window as any).__orcsPortraitStatus;
    expect(status).toBeTruthy();
    expect(status.tried.length).toBeGreaterThan(0);
    expect(status.ok.length).toBeGreaterThan(0);
    expect(status.fail.length).toBe(0);
  });

  it('falls back to placeholder art when atlases fail to load', async () => {
    failLoads = true;
    const { findByAltText } = render(<OfficerAvatar officerId="Fallback:1" />);
    const element = await findByAltText('Fallback:1');

    await waitFor(() => {
      expect(element.getAttribute('data-art')).toBe('fallback');
      expect(element.getAttribute('src')).toMatch(/^data:image\/png/);
    });

    const status = (window as any).__orcsPortraitStatus;
    expect(status.tried.length).toBeGreaterThan(0);
    expect(status.fail.length).toBeGreaterThanOrEqual(2);
    expect(status.failed.length).toBeGreaterThanOrEqual(2);
    expect(element.querySelector('svg')).toBeTruthy();
  });
});
