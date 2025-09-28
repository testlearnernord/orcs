/**
 * Map loader for handcrafted maps
 */

import type { HandMapMeta, HandMapData } from './types';
import { mapAssetPath } from '@/lib/paths';

/**
 * Load an image from a URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) =>
      reject(new Error(`Failed to load image: ${url} - ${error}`));
    img.src = url;
  });
}

/**
 * Load JSON from a URL
 */
async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load JSON: ${url} - ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

/**
 * Generate collision grid from collision image
 */
function generateCollisionGrid(
  collisionImg: HTMLImageElement,
  tileSize: number
): {
  blocked: Uint8Array;
  gridWidth: number;
  gridHeight: number;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context for collision processing');
  }

  canvas.width = collisionImg.width;
  canvas.height = collisionImg.height;
  ctx.drawImage(collisionImg, 0, 0);

  const gridWidth = Math.ceil(collisionImg.width / tileSize);
  const gridHeight = Math.ceil(collisionImg.height / tileSize);
  const blocked = new Uint8Array(gridWidth * gridHeight);

  // Sample each tile at its center pixel
  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const centerX = Math.min(
        gx * tileSize + Math.floor(tileSize / 2),
        collisionImg.width - 1
      );
      const centerY = Math.min(
        gy * tileSize + Math.floor(tileSize / 2),
        collisionImg.height - 1
      );

      const imageData = ctx.getImageData(centerX, centerY, 1, 1);
      const [r, g, b, a] = imageData.data;

      // Blocked if alpha is 0 (transparent) or RGB is very dark (close to black)
      const isTransparent = a === 0;
      const isDark = r < 50 && g < 50 && b < 50; // Very dark threshold
      const isBlocked = isTransparent || isDark;

      const index = gy * gridWidth + gx;
      blocked[index] = isBlocked ? 1 : 0;
    }
  }

  return { blocked, gridWidth, gridHeight };
}

/**
 * Check if a grid coordinate is blocked
 */
export function isBlocked(map: HandMapData, gx: number, gy: number): boolean {
  if (gx < 0 || gx >= map.gridWidth || gy < 0 || gy >= map.gridHeight) {
    return true; // Out of bounds is blocked
  }
  const index = gy * map.gridWidth + gx;
  return map.blocked[index] === 1;
}

/**
 * Check if a pixel coordinate can be stood on (not blocked)
 */
export function canStandPx(map: HandMapData, px: number, py: number): boolean {
  const gx = Math.floor(px / map.meta.tileSize);
  const gy = Math.floor(py / map.meta.tileSize);
  return !isBlocked(map, gx, gy);
}

/**
 * Load a handcrafted map by ID
 */
export async function loadHandMap(mapId: string): Promise<HandMapData> {
  try {
    // Load all assets in parallel using base URL-safe paths
    const [meta, terrain, collision] = await Promise.all([
      loadJson<HandMapMeta>(mapAssetPath(mapId, 'meta.json')),
      loadImage(mapAssetPath(mapId, 'terrain.png')),
      loadImage(mapAssetPath(mapId, 'collision.png'))
    ]);

    // Validate meta data
    if (!meta.tileSize || meta.tileSize <= 0) {
      throw new Error(`Invalid tile size in meta.json: ${meta.tileSize}`);
    }

    // Generate collision grid
    const { blocked, gridWidth, gridHeight } = generateCollisionGrid(
      collision,
      meta.tileSize
    );

    // Verify terrain and collision images are compatible
    if (
      terrain.width !== collision.width ||
      terrain.height !== collision.height
    ) {
      throw new Error(
        `Terrain and collision images must have the same dimensions. ` +
          `Terrain: ${terrain.width}x${terrain.height}, Collision: ${collision.width}x${collision.height}`
      );
    }

    // Verify pixel size matches actual image dimensions
    if (
      meta.pixelSize.width !== terrain.width ||
      meta.pixelSize.height !== terrain.height
    ) {
      console.warn(
        `Meta pixelSize (${meta.pixelSize.width}x${meta.pixelSize.height}) ` +
          `does not match actual image size (${terrain.width}x${terrain.height}). Using actual size.`
      );
      meta.pixelSize.width = terrain.width;
      meta.pixelSize.height = terrain.height;
    }

    return {
      meta,
      terrain,
      collision,
      blocked,
      gridWidth,
      gridHeight
    };
  } catch (error) {
    throw new Error(
      `Failed to load handcrafted map '${mapId}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
