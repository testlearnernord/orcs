/**
 * Types and interfaces for handcrafted maps in Free-Roam mode
 */

export interface HandMapMeta {
  name: string;
  pixelSize: {
    width: number;
    height: number;
  };
  tileSize: number;
  camera: {
    minZoom: number;
    maxZoom: number;
    startZoom: number;
  };
  spawns: {
    player: {
      x: number;
      y: number;
    };
    officers: Array<{
      x: number;
      y: number;
    }>;
  };
  pois: Array<{
    id: string;
    x: number;
    y: number;
    label: string;
  }>;
}

export interface HandMapData {
  meta: HandMapMeta;
  terrain: HTMLImageElement;
  collision: HTMLImageElement;
  blocked: Uint8Array; // Grid of blocked tiles (1 = blocked, 0 = passable)
  gridWidth: number; // Number of tiles horizontally
  gridHeight: number; // Number of tiles vertically
}

export interface GridCoordinate {
  gx: number; // Grid X coordinate
  gy: number; // Grid Y coordinate
}

export interface PixelCoordinate {
  px: number; // Pixel X coordinate
  py: number; // Pixel Y coordinate
}

/**
 * Convert pixel coordinates to grid coordinates
 */
export function pixelToGrid(
  px: number,
  py: number,
  tileSize: number
): GridCoordinate {
  return {
    gx: Math.floor(px / tileSize),
    gy: Math.floor(py / tileSize)
  };
}

/**
 * Convert grid coordinates to pixel coordinates (center of tile)
 */
export function gridToPixel(
  gx: number,
  gy: number,
  tileSize: number
): PixelCoordinate {
  return {
    px: gx * tileSize + tileSize / 2,
    py: gy * tileSize + tileSize / 2
  };
}

/**
 * Check if a grid coordinate is within bounds
 */
export function isValidGridCoord(
  gx: number,
  gy: number,
  gridWidth: number,
  gridHeight: number
): boolean {
  return gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight;
}

/**
 * Convert 2D grid coordinates to 1D array index
 */
export function gridToIndex(gx: number, gy: number, gridWidth: number): number {
  return gy * gridWidth + gx;
}

/**
 * Convert 1D array index to 2D grid coordinates
 */
export function indexToGrid(index: number, gridWidth: number): GridCoordinate {
  return {
    gx: index % gridWidth,
    gy: Math.floor(index / gridWidth)
  };
}
