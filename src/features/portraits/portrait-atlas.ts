const atlasCache = new Map<string, Promise<HTMLImageElement>>();

export async function loadAtlas(url: string): Promise<HTMLImageElement> {
  if (!url) {
    return Promise.reject(new Error('portrait atlas failed: empty url'));
  }
  if (atlasCache.has(url)) {
    return atlasCache.get(url)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error(`portrait atlas failed: ${url}`));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`portrait atlas failed: ${url}`));
    img.decoding = 'async';
    img.src = url;
  });
  atlasCache.set(url, promise);
  return promise;
}

export type PortraitAtlasLoadResult = {
  images: HTMLImageElement[];
  ok: string[];
  failed: string[];
};

export async function loadPortraitAtlases(
  urls: string[]
): Promise<PortraitAtlasLoadResult> {
  const ok: string[] = [];
  const failed: string[] = [];
  const images: HTMLImageElement[] = [];

  for (const url of urls) {
    try {
      const img = await loadAtlas(url);
      ok.push(url);
      images.push(img);
    } catch (error) {
      console.warn('[portraits] 404/err:', url);
      failed.push(url);
    }
  }

  if (typeof window !== 'undefined') {
    (window as any).__orcsPortraitStatus = { tried: [...urls], ok, failed };
  }

  return { images, ok, failed };
}

export function resetPortraitAtlasCache(): void {
  atlasCache.clear();
}
