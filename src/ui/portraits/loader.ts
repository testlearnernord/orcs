import { ATLAS_SPECS } from './config';
import type { AtlasDefinition, AtlasSpec } from './config';
import { LOCAL_URLS, REMOTE_URLS } from './urls';

export type LoadedAtlas = {
  spec: AtlasSpec;
  image: HTMLImageElement;
  url: string;
};

export type PortraitLoadStatus = {
  tried: string[];
  ok: string[];
  fail: string[];
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();
let loadPromise: Promise<LoadedAtlas[]> | null = null;
let lastStatus: PortraitLoadStatus | null = null;

function loadImage(url: string): Promise<HTMLImageElement> {
  if (!imageCache.has(url)) {
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        if (typeof Image === 'undefined') {
          reject(new Error(`portrait atlas failed: ${url}`));
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`portrait atlas failed: ${url}`));
        img.src = url;
      })
    );
  }
  return imageCache.get(url)!;
}

function attachStatus(status: PortraitLoadStatus) {
  if (typeof window !== 'undefined') {
    (window as any).__orcsPortraitStatus = status;
    console.info('[portraits] status', status);
  }
  lastStatus = status;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' });
  }

  const htmlCanvas = canvas as HTMLCanvasElement;
  if (htmlCanvas.toBlob) {
    return new Promise((resolve, reject) => {
      htmlCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('canvas toBlob failed'));
        }
      }, 'image/png');
    });
  }

  const dataUrl = htmlCanvas.toDataURL('image/png');
  const [, encoded] = dataUrl.split(',', 2);
  const decodeBase64 = (input: string) => {
    if (typeof atob === 'function') {
      return atob(input);
    }
    const nodeBuffer = (
      globalThis as {
        Buffer?: {
          from(
            input: string,
            encoding: string
          ): { toString(encoding: string): string };
        };
      }
    ).Buffer;
    if (nodeBuffer) {
      return nodeBuffer.from(input, 'base64').toString('binary');
    }
    throw new Error('No base64 decoder available');
  };
  const binary = decodeBase64(encoded);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: 'image/png' });
}

async function tryCandidates(
  spec: AtlasDefinition,
  candidates: string[],
  status: PortraitLoadStatus
): Promise<LoadedAtlas | null> {
  for (const url of candidates) {
    status.tried.push(url);
    try {
      const image = await loadImage(url);
      const resolvedUrl = image.src || url;
      status.ok.push(resolvedUrl);
      return {
        spec: { ...spec, src: resolvedUrl },
        image,
        url: resolvedUrl
      };
    } catch (error) {
      status.fail.push(url);
    }
  }
  return null;
}

async function performLoad(): Promise<LoadedAtlas[]> {
  const status: PortraitLoadStatus = { tried: [], ok: [], fail: [] };
  const results: LoadedAtlas[] = [];

  for (let i = 0; i < ATLAS_SPECS.length; i += 1) {
    const definition = ATLAS_SPECS[i];
    const candidates: string[] = [];
    if (LOCAL_URLS[i]) candidates.push(LOCAL_URLS[i]);
    if (REMOTE_URLS[i]) candidates.push(REMOTE_URLS[i]);

    if (!candidates.length) continue;

    const loaded = await tryCandidates(definition, candidates, status);
    if (loaded) {
      results.push(loaded);
    }
  }

  if (!results.length) {
    attachStatus(status);
    throw new Error('no portrait atlases available');
  }

  attachStatus(status);
  return results;
}

export async function loadAtlases(): Promise<LoadedAtlas[]> {
  if (!loadPromise) {
    loadPromise = performLoad().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

export const loadPortraitAtlases = loadAtlases;

export async function sliceTileToURL(
  atlas: LoadedAtlas,
  index: number,
  outSize = atlas.spec.tile
): Promise<string> {
  const { spec, image } = atlas;
  const { cols, rows, tile } = spec;
  const totalTiles = Math.max(1, cols * rows);
  const clampedIndex = Math.max(0, Math.min(index, totalTiles - 1));
  const col = Math.floor(clampedIndex % cols);
  const row = Math.floor(clampedIndex / cols);
  const sx = col * tile;
  const sy = row * tile;
  const sw = tile;
  const sh = tile;
  const size = Math.max(1, Math.round(outSize));

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(size, size)
      : Object.assign(document.createElement('canvas'), {
          width: size,
          height: size
        });

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('unable to acquire canvas context');
  }

  if ('imageSmoothingEnabled' in ctx) {
    (ctx as any).imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) {
      (ctx as any).imageSmoothingQuality = 'high';
    }
  }

  let source: CanvasImageSource = image;
  let sourceSx = sx;
  let sourceSy = sy;
  let sourceSw = sw;
  let sourceSh = sh;

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(image, sx, sy, sw, sh);
      source = bitmap;
      sourceSx = 0;
      sourceSy = 0;
      sourceSw = bitmap.width;
      sourceSh = bitmap.height;
    } catch {
      // ignore and fall back to drawing from the base image
    }
  }

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(
    source,
    sourceSx,
    sourceSy,
    sourceSw,
    sourceSh,
    0,
    0,
    size,
    size
  );

  const blob = await canvasToBlob(canvas);
  return URL.createObjectURL(blob);
}

export function resetPortraitAtlasCache(): void {
  imageCache.clear();
  loadPromise = null;
  lastStatus = null;
}

export function getLastPortraitStatus(): PortraitLoadStatus | null {
  return lastStatus
    ? {
        ...lastStatus,
        tried: [...lastStatus.tried],
        ok: [...lastStatus.ok],
        fail: [...lastStatus.fail]
      }
    : null;
}
