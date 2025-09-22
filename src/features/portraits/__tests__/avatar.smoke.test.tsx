import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OfficerAvatar } from '../Avatar';

const manifest = {
  version: 1,
  sets: [
    {
      id: 'set_a',
      src: 'assets/orcs/portraits/set_a.webp',
      cols: 6,
      rows: 8
    },
    {
      id: 'set_b',
      src: 'assets/orcs/portraits/set_b.webp',
      cols: 6,
      rows: 8
    }
  ]
};

type MockFetch = typeof fetch;

type ImageCtor = typeof Image;

const originalFetch: MockFetch | undefined = global.fetch;
const originalImage: ImageCtor | undefined = global.Image;

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
      if (value.includes('fail')) {
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
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => manifest
  }) as unknown as MockFetch;
  global.Image = MockImage as unknown as ImageCtor;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  if (originalImage) {
    global.Image = originalImage;
  }
});

describe('OfficerAvatar', () => {
  it('renders a background image for the officer', async () => {
    const { findByRole } = render(<OfficerAvatar officerId="Test:1" />);
    const element = await findByRole('img');
    await waitFor(() => {
      expect(element.getAttribute('data-portrait-set')).toBeTruthy();
      expect(element.style.backgroundImage).toMatch(/set_[ab]\.webp/);
      expect(element.style.backgroundSize).toMatch(/px/);
    });
  });
});
