import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OfficerAvatar } from '../Avatar';
import { resetPortraitAtlasCache } from '../portrait-atlas';

type ImageCtor = typeof Image;

const originalImage: ImageCtor | undefined = global.Image;

let failLoads = false;

class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  decoding = 'async';
  naturalWidth = 768;
  naturalHeight = 1024;
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

beforeEach(() => {
  failLoads = false;
  (globalThis as any).__orcsPortraitStatus = undefined;
  global.Image = MockImage as unknown as ImageCtor;
});

afterEach(() => {
  vi.restoreAllMocks();
  resetPortraitAtlasCache();
  cleanup();
  if (originalImage) {
    global.Image = originalImage;
  }
});

describe('OfficerAvatar', () => {
  it('renders a background image for the officer', async () => {
    const { findByRole } = render(<OfficerAvatar officerId="Test:1" />);
    const element = await findByRole('img');
    await waitFor(() => {
      expect(element.getAttribute('data-portrait-set')).toMatch(/officers[1-3]/);
      expect(element.style.backgroundImage).toMatch(/\.png/);
      expect(element.style.backgroundSize).toMatch(/%/);
      expect(element.style.backgroundPosition).toMatch(/%/);
    });
    const status = (window as any).__orcsPortraitStatus;
    expect(status).toBeTruthy();
    expect(status.tried.length).toBeGreaterThan(0);
    expect(status.ok.length).toBeGreaterThan(0);
    expect(status.failed.length).toBe(0);
    expect(element.getAttribute('data-art')).toBeFalsy();
  });

  it('falls back to placeholder art when atlases fail to load', async () => {
    failLoads = true;
    const { findByRole } = render(<OfficerAvatar officerId="Fallback:1" />);
    const element = await findByRole('img');
    await waitFor(() => {
      expect(element.getAttribute('data-art')).toBe('fallback');
    });
    const status = (window as any).__orcsPortraitStatus;
    expect(status.tried.length).toBeGreaterThan(0);
    expect(status.failed.length).toBeGreaterThanOrEqual(2);
    expect(element.querySelector('svg')).toBeTruthy();
  });
});
