import type { Biome, WorldMap } from './generator';

export const BIOME_COLORS: Record<Biome, string> = {
  desert: '#d7a86b',
  plains: '#5fa463',
  forest: '#2f6f3b',
  swamp: '#244836',
  tundra: '#a9c2d9',
  ashwastes: '#5b5463',
  volcano: '#c34632',
  river: '#3b6fc1'
};

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function renderWorldMap(
  canvas: HTMLCanvasElement,
  map: WorldMap,
  palette: Partial<Record<Biome, string>> = {}
): void {
  const context = canvas.getContext('2d');
  if (!context) return;

  // Get the display size and device pixel ratio for crisp rendering
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const pixelRatio = window.devicePixelRatio || 1;

  // Set canvas size to match display size * pixel ratio for crisp rendering
  const canvasWidth = Math.floor(displayWidth * pixelRatio);
  const canvasHeight = Math.floor(displayHeight * pixelRatio);

  if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Scale context to match device pixel ratio
    context.scale(pixelRatio, pixelRatio);
  }

  // Set CSS size to actual display size
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  // Clear canvas
  context.clearRect(0, 0, displayWidth, displayHeight);

  // Create image data at map resolution
  const imageData = context.createImageData(map.size, map.size);
  const { data } = imageData;

  for (let i = 0; i < map.tiles.length; i += 1) {
    const biome = map.tiles[i];
    const baseColor = palette[biome] ?? BIOME_COLORS[biome];
    const [r, g, b] = hexToRgb(baseColor);
    const height = map.height[i];
    const moisture = map.moisture[i];
    const shade = clamp01(0.75 + height * 0.3 - moisture * 0.1);
    const index = i * 4;
    data[index] = Math.round(r * shade);
    data[index + 1] = Math.round(g * shade);
    data[index + 2] = Math.round(b * shade);
    data[index + 3] = 255;
  }

  // Create an off-screen canvas to render the map data
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = map.size;
  offscreenCanvas.height = map.size;
  const offscreenContext = offscreenCanvas.getContext('2d');
  
  if (offscreenContext) {
    offscreenContext.putImageData(imageData, 0, 0);
    
    // Draw the off-screen canvas to the main canvas, scaled to fit
    context.imageSmoothingEnabled = false; // Keep pixelated look
    context.drawImage(offscreenCanvas, 0, 0, displayWidth, displayHeight);
  }
}
