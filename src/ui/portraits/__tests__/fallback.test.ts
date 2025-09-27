import { describe, expect, beforeEach, afterEach, it } from 'vitest';

import {
  clearSilhouetteCache,
  getSilhouetteCacheSize,
  makeSilhouetteDataURL
} from '../fallback';

describe('makeSilhouetteDataURL', () => {
  const originalGetContext =
    HTMLCanvasElement.prototype.getContext ?? (() => null);
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL ?? (() => '');

  beforeEach(() => {
    clearSilhouetteCache();
    HTMLCanvasElement.prototype.getContext = (() => ({
      clearRect: () => undefined,
      fillStyle: '#000',
      fillRect: () => undefined,
      beginPath: () => undefined,
      arc: () => undefined,
      fill: () => undefined
    })) as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = (() =>
      'data:image/png;base64,AAA') as typeof HTMLCanvasElement.prototype.toDataURL;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('returns an empty string when no document is available', () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error - intentionally unset for the test
    delete (globalThis as { document?: Document }).document;

    try {
      expect(makeSilhouetteDataURL(64)).toBe('');
      expect(getSilhouetteCacheSize()).toBe(0);
    } finally {
      if (originalDocument) {
        (globalThis as { document?: Document }).document = originalDocument;
      }
    }
  });

  it('caches silhouettes by rounded size', () => {
    const first = makeSilhouetteDataURL(63.7);
    const second = makeSilhouetteDataURL(64.2);

    expect(first).toBe(second);
    expect(getSilhouetteCacheSize()).toBe(1);
  });
});
