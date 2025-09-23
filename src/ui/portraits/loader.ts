import { PORTRAIT_SOURCES } from './config';

export type LoadedPortraitAtlas = {
  id: string;
  image: HTMLImageElement;
  url: string;
};

export type PortraitAtlasMap = Map<string, LoadedPortraitAtlas>;

export type PortraitAtlasLoadResult = {
  tried: string[];
  ok: string[];
  failed: string[];
  images: HTMLImageElement[];
  atlases: PortraitAtlasMap;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();
let allAtlasesPromise: Promise<PortraitAtlasLoadResult> | null = null;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error(`portrait atlas failed: ${url}`));
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`portrait atlas failed: ${url}`));
    img.src = url;
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  if (!imageCache.has(url)) {
    imageCache.set(url, createImage(url));
  }
  return imageCache.get(url)!;
}

async function performLoad(): Promise<PortraitAtlasLoadResult> {
  const tried: string[] = [];
  const ok: string[] = [];
  const failed: string[] = [];
  const images: HTMLImageElement[] = [];
  const atlases: PortraitAtlasMap = new Map();

  for (const source of PORTRAIT_SOURCES) {
    let loaded = false;

    for (const url of source.urls) {
      tried.push(url);
      try {
        const image = await loadImage(url);
        const resolvedUrl = image.src || url;
        atlases.set(source.id, {
          id: source.id,
          image,
          url: resolvedUrl
        });
        images.push(image);
        ok.push(resolvedUrl);
        loaded = true;
        break;
      } catch (error) {
        failed.push(url);
      }
    }

    if (!loaded) {
      // keep iterating through remaining sources so we record failures
      continue;
    }
  }

  const status = { tried, ok, failed };

  if (typeof window !== 'undefined') {
    (window as any).__orcsPortraitStatus = status;
    console.info('[portraits] atlases', status);
  }

  if (images.length === 0) {
    throw new Error('no portrait atlases available');
  }

  return { tried, ok, failed, images, atlases };
}

export async function loadPortraitAtlases(): Promise<PortraitAtlasLoadResult> {
  if (!allAtlasesPromise) {
    allAtlasesPromise = performLoad().catch((error) => {
      allAtlasesPromise = null;
      throw error;
    });
  }
  return allAtlasesPromise;
}

export function resetPortraitAtlasCache(): void {
  imageCache.clear();
  allAtlasesPromise = null;
}
