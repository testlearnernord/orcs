import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

import { RNG } from '../src/sim/rng';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARTS_DIR = join(__dirname, '../src/assets/orc/parts');
const OUTPUT_DIR = join(__dirname, '../src/assets/orc/generated');
const OUTPUT_JSON = join(OUTPUT_DIR, 'orc_catalog.json');
const SIZE = 64;
const COUNT = 80;
const EMIT_PNG = process.argv.includes('--emit-png');

type Palette = string[];

function loadPalette(name: string): Palette {
  const file = join(PARTS_DIR, `${name}.json`);
  const content = readFileSync(file, 'utf8');
  return JSON.parse(content) as string[];
}

const skinPalette = loadPalette('skin');
const eyePalette = loadPalette('eyes');
const mouthPalette = loadPalette('mouth');
const helmetPalette = loadPalette('helmets');
const armorPalette = loadPalette('armors');
const markingsPalette = loadPalette('markings');

interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b, a: 255 };
}

function setPixel(png: PNG, x: number, y: number, color: RGB): void {
  const idx = (SIZE * y + x) << 2;
  png.data[idx] = color.r;
  png.data[idx + 1] = color.g;
  png.data[idx + 2] = color.b;
  png.data[idx + 3] = color.a;
}

function fillRect(
  png: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB
): void {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;
      setPixel(png, xx, yy, color);
    }
  }
}

function drawPortrait(seed: string, rng: RNG): PNG {
  const png = new PNG({ width: SIZE, height: SIZE });
  const skinValue = rng.pick(skinPalette);
  const eyeValue = rng.pick(eyePalette);
  const skin = hexToRgb(skinValue);
  const eyes = hexToRgb(eyeValue);
  const mouth = hexToRgb(rng.pick(mouthPalette));
  const helmet = hexToRgb(rng.pick(helmetPalette));
  const armor = hexToRgb(rng.pick(armorPalette));
  const marking = hexToRgb(rng.pick(markingsPalette));

  fillRect(png, 0, 0, SIZE, SIZE, skin);
  fillRect(png, 0, 0, SIZE, 18, helmet);
  fillRect(png, 0, SIZE - 18, SIZE, 18, armor);

  const eyeY = 26 + rng.int(-2, 2);
  const eyeGap = 6 + rng.int(0, 4);
  fillRect(png, 18, eyeY, 8, 4, eyes);
  fillRect(png, 18 + 12 + eyeGap, eyeY, 8, 4, eyes);

  const mouthY = eyeY + 12 + rng.int(0, 4);
  fillRect(png, 20, mouthY, 24, 3, mouth);

  const stripeX = rng.int(10, 40);
  fillRect(png, stripeX, 10, 4, 44, marking);

  return png;
}

function pad(value: number): string {
  return value.toString().padStart(3, '0');
}

function generate(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const catalog: Array<{ seed: string; data: string }> = [];
  for (let index = 0; index < COUNT; index += 1) {
    const seed = `orc-${pad(index + 1)}`;
    const rng = new RNG(seed);
    const png = drawPortrait(seed, rng);
    const buffer = PNG.sync.write(png);
    const base64 = buffer.toString('base64');
    if (EMIT_PNG) {
      const file = join(OUTPUT_DIR, `${seed}.png`);
      writeFileSync(file, buffer);
    }
    catalog.push({ seed, data: base64 });
  }
  writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2));
  if (EMIT_PNG) {
    console.log(`Generated ${COUNT} orc portraits (PNG + base64 catalog).`);
  } else {
    console.log(`Generated ${COUNT} orc portraits (base64 catalog only).`);
  }
}

generate();
