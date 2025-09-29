/**
 * Terrain renderer for handcrafted maps
 */

import type { HandMapData } from './types';

export interface CameraState {
  x: number;
  y: number;
  scale: number;
}

/**
 * Draw the terrain background
 */
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  map: HandMapData,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Apply camera transform
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);

  // Draw terrain image
  ctx.drawImage(map.terrain, 0, 0, map.terrain.width, map.terrain.height);

  ctx.restore();
}

/**
 * Draw debug collision overlay (semi-transparent blocked areas)
 */
export function drawDebugCollision(
  ctx: CanvasRenderingContext2D,
  map: HandMapData,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Apply camera transform
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);

  // Draw blocked tiles
  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red

  const tileSize = map.meta.tileSize;

  // Calculate visible tile range to optimize rendering
  const viewLeft = camera.x - canvasWidth / (2 * camera.scale);
  const viewRight = camera.x + canvasWidth / (2 * camera.scale);
  const viewTop = camera.y - canvasHeight / (2 * camera.scale);
  const viewBottom = camera.y + canvasHeight / (2 * camera.scale);

  const startGx = Math.max(0, Math.floor(viewLeft / tileSize));
  const endGx = Math.min(map.gridWidth - 1, Math.ceil(viewRight / tileSize));
  const startGy = Math.max(0, Math.floor(viewTop / tileSize));
  const endGy = Math.min(map.gridHeight - 1, Math.ceil(viewBottom / tileSize));

  for (let gy = startGy; gy <= endGy; gy++) {
    for (let gx = startGx; gx <= endGx; gx++) {
      const index = gy * map.gridWidth + gx;
      if (map.blocked[index] === 1) {
        ctx.fillRect(gx * tileSize, gy * tileSize, tileSize, tileSize);
      }
    }
  }

  ctx.restore();
}

/**
 * Draw POI labels
 */
export function drawPOILabels(
  ctx: CanvasRenderingContext2D,
  map: HandMapData,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Apply camera transform
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);

  // Configure text style
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw POI labels
  for (const poi of map.meta.pois) {
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const textMetrics = ctx.measureText(poi.label);
    const padding = 4;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = 20;

    ctx.fillRect(poi.x - bgWidth / 2, poi.y - bgHeight / 2, bgWidth, bgHeight);

    // Draw text
    ctx.fillStyle = 'white';
    ctx.fillText(poi.label, poi.x, poi.y);
  }

  ctx.restore();
}

/**
 * Draw officer icons and labels
 */
export function drawOfficerIcons(
  ctx: CanvasRenderingContext2D,
  officers: Array<{ x: number; y: number; name: string }>,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Apply camera transform
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);

  for (const officer of officers) {
    // Draw officer icon (increased size for better visibility)
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath();
    ctx.arc(officer.x, officer.y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw name label
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const textMetrics = ctx.measureText(officer.name);
    const padding = 2;
    ctx.fillRect(
      officer.x - textMetrics.width / 2 - padding,
      officer.y + 12,
      textMetrics.width + padding * 2,
      14
    );

    // Text
    ctx.fillStyle = 'white';
    ctx.fillText(officer.name, officer.x, officer.y + 14);
  }

  ctx.restore();
}

/**
 * Draw player icon
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Apply camera transform
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);

  // Draw player icon (increased size for better visibility)
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(playerX, playerY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw inner dot
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(playerX, playerY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
