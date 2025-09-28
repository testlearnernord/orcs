/**
 * Deterministic Grid-Slicer + Face-ROI-Crop for Officer Portraits
 *
 * This utility provides exact pixel-based portrait cropping following the specifications:
 * - Red frame = exact sprite cut (tile)
 * - Blue frame = face area that must be visible and centered in final portrait
 *
 * Each spritesheet is 1024x1024 with a 4x4 grid = 256x256px per orc tile.
 * No overlaps, no half heads, fixed coordinates only.
 */

export const GRID = 4;
export const TILE = 256;
export const ATLAS_SIZE = 1024; // 1024x1024 spritesheets

/**
 * Face-ROI (Region of Interest) within a 256x256 tile.
 * Positioned to show eyes, nose, mouth fully visible.
 * Forehead not cut off, chin not cut off.
 *
 * These coordinates are based on the "blue frame" requirements:
 * - x: horizontal offset from tile left edge
 * - y: vertical offset from tile top edge
 * - w: width of the face region
 * - h: height of the face region
 */
export const BASE_FACE_ROI = {
  x: 32, // Start 32px from left edge of tile (leaves margin for ears/sides)
  y: 48, // Start 48px from top edge (includes forehead, doesn't cut it off)
  w: 192, // 192px width (256 - 32*2 = full face width with margins)
  h: 192 // 192px height (enough for full face from forehead to chin)
};

/**
 * Optional fine-tuning offsets per sheet if individual rows/sheets deviate.
 * Positive values move the ROI right/down, negative values move left/up.
 */
type SheetOffsets = {
  x?: number;
  y?: number;
};

const SHEET_OFFSETS: Record<string, SheetOffsets> = {
  officers1: { x: 0, y: 0 }, // No offset needed
  officers2: { x: 0, y: 0 }, // No offset needed
  officers3: { x: 0, y: 0 } // No offset needed
  // Add offsets here if specific sheets need fine-tuning
};

/**
 * Calculate exact tile coordinates and face ROI for a given officer
 */
export function calculatePortraitCrop(
  sheetId: string,
  col: number,
  row: number
): {
  // Tile boundaries within the 1024x1024 atlas
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;

  // Face ROI within the atlas (absolute coordinates)
  faceX: number;
  faceY: number;
  faceW: number;
  faceH: number;

  // CSS background properties for displaying the cropped face
  backgroundSize: string;
  backgroundPosition: string;
} {
  // Validate grid bounds
  if (col < 0 || col >= GRID || row < 0 || row >= GRID) {
    throw new Error(
      `Invalid grid position: col=${col}, row=${row}. Grid is ${GRID}x${GRID}`
    );
  }

  // Calculate exact tile boundaries
  const tileX = col * TILE;
  const tileY = row * TILE;
  const tileW = TILE;
  const tileH = TILE;

  // Get sheet-specific offsets
  const offsets = SHEET_OFFSETS[sheetId] || { x: 0, y: 0 };

  // Calculate face ROI within the atlas (absolute coordinates)
  const faceX = tileX + BASE_FACE_ROI.x + (offsets.x || 0);
  const faceY = tileY + BASE_FACE_ROI.y + (offsets.y || 0);
  const faceW = BASE_FACE_ROI.w;
  const faceH = BASE_FACE_ROI.h;

  // Calculate CSS background properties to display just the face region
  // We need to scale the entire atlas and position it so only the face shows

  // Scale factor: how much to enlarge the atlas so face region fills the portrait
  // If portrait is 96px and face region is 192px, we scale by 96/192 = 0.5 (50%)
  // But we need the inverse for CSS background-size (we're scaling the source)
  const scaleX = ATLAS_SIZE / faceW; // How much larger the atlas is vs face width
  const scaleY = ATLAS_SIZE / faceH; // How much larger the atlas is vs face height

  // CSS background-size as percentages (100% = portrait size)
  const backgroundSizeX = scaleX * 100;
  const backgroundSizeY = scaleY * 100;

  // Position: how far to offset the scaled atlas so the face region aligns with portrait
  // CSS background-position works with percentages of the (background size - element size)
  const positionX = (faceX / (ATLAS_SIZE - faceW)) * 100;
  const positionY = (faceY / (ATLAS_SIZE - faceH)) * 100;

  return {
    tileX,
    tileY,
    tileW,
    tileH,
    faceX,
    faceY,
    faceW,
    faceH,
    backgroundSize: `${backgroundSizeX}% ${backgroundSizeY}%`,
    backgroundPosition: `${positionX}% ${positionY}%`
  };
}

/**
 * Get all possible portrait positions for debugging/testing
 */
export function getAllPortraitPositions() {
  const positions = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      positions.push({ col, row });
    }
  }
  return positions;
}
