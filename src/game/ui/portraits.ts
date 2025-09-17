import type Phaser from "phaser";

const PORTRAIT_SIZE = 96;
const FACE_RADIUS = 40;
const VARIANT_COUNT = 40;

interface PortraitVariant {
  background: number;
  skin: number;
  jaw: number;
  eyes: number;
  iris: number;
  tusk: number;
  adornment: {
    kind: "SCAR" | "PAINT" | "TATTOO" | "PIERCING" | "HAIR" | "HELM" | "BRAND" | "MASK";
    color: number;
  };
  hornStyle: "NONE" | "SMALL" | "LARGE";
  browStyle: "DEFAULT" | "ANGLED" | "HEAVY" | "CURVED";
}

const BACKGROUNDS = [
  0x17212b,
  0x1f2a33,
  0x2b1d2d,
  0x1c2f2d,
  0x33261f,
  0x222535,
  0x2a1f33,
  0x1d2e3b
];

const SKIN_TONES = [
  0x4d6743,
  0x4f5f36,
  0x566c49,
  0x5d7040,
  0x607a4f
];

const JAW_TONES = [
  0x394f2a,
  0x465d36,
  0x425433,
  0x374a2a
];

const EYE_WHITES = [
  0xf6f1d5,
  0xede0d4,
  0xe2e6da,
  0xf1f3eb,
  0xf7f0de
];

const IRIS_TONES = [
  0x3d405b,
  0x577590,
  0xb56576,
  0x006d77,
  0xffb703,
  0xd62828
];

const TUSK_TONES = [
  0xf2e9e4,
  0xe6dcd2,
  0xd9cab3,
  0xcbb79f
];

const ADORNMENTS: PortraitVariant["adornment"][] = [
  { kind: "SCAR", color: 0xff6b6b },
  { kind: "SCAR", color: 0xf28482 },
  { kind: "PAINT", color: 0x4895ef },
  { kind: "PAINT", color: 0x2a9d8f },
  { kind: "TATTOO", color: 0xf7b801 },
  { kind: "PIERCING", color: 0xe9ecef },
  { kind: "HAIR", color: 0x4a4e69 },
  { kind: "HELM", color: 0x6c757d },
  { kind: "BRAND", color: 0xc77dff },
  { kind: "MASK", color: 0x03045e }
];

const HORN_STYLES: PortraitVariant["hornStyle"][] = ["NONE", "SMALL", "LARGE"];
const BROW_STYLES: PortraitVariant["browStyle"][] = [
  "DEFAULT",
  "ANGLED",
  "HEAVY",
  "CURVED"
];

function blend(color: number, target: number, ratio: number): number {
  const r = ((color >> 16) & 0xff) * (1 - ratio) + ((target >> 16) & 0xff) * ratio;
  const g = ((color >> 8) & 0xff) * (1 - ratio) + ((target >> 8) & 0xff) * ratio;
  const b = (color & 0xff) * (1 - ratio) + (target & 0xff) * ratio;
  return (
    (Math.max(0, Math.min(255, Math.round(r))) << 16) |
    (Math.max(0, Math.min(255, Math.round(g))) << 8) |
    Math.max(0, Math.min(255, Math.round(b)))
  );
}

function createVariants(): PortraitVariant[] {
  const variants: PortraitVariant[] = [];
  let index = 0;
  for (const skin of SKIN_TONES) {
    for (const background of BACKGROUNDS) {
      const adornment = ADORNMENTS[index % ADORNMENTS.length];
      const hornStyle = HORN_STYLES[index % HORN_STYLES.length];
      const browStyle = BROW_STYLES[index % BROW_STYLES.length];
      const eyes = EYE_WHITES[index % EYE_WHITES.length];
      const iris = IRIS_TONES[index % IRIS_TONES.length];
      const jaw = JAW_TONES[index % JAW_TONES.length];
      const tusk = TUSK_TONES[index % TUSK_TONES.length];
      variants.push({
        background,
        skin,
        jaw,
        eyes,
        iris,
        tusk,
        adornment,
        hornStyle,
        browStyle
      });
      index += 1;
    }
  }
  return variants.slice(0, VARIANT_COUNT);
}

const VARIANTS = createVariants();

function drawHorns(graphics: Phaser.GameObjects.Graphics, variant: PortraitVariant): void {
  const hornColor = blend(variant.skin, 0xfefae0, 0.35);
  graphics.fillStyle(hornColor, 1);
  if (variant.hornStyle === "SMALL" || variant.hornStyle === "LARGE") {
    graphics.fillTriangle(48, 10, 38, 26, 56, 26);
    graphics.fillTriangle(PORTRAIT_SIZE - 48, 10, PORTRAIT_SIZE - 56, 26, PORTRAIT_SIZE - 38, 26);
    if (variant.hornStyle === "LARGE") {
      graphics.fillTriangle(60, 6, 50, 20, 66, 24);
      graphics.fillTriangle(PORTRAIT_SIZE - 60, 6, PORTRAIT_SIZE - 66, 24, PORTRAIT_SIZE - 50, 20);
    }
    graphics.lineStyle(2, blend(hornColor, 0x1b1d23, 0.55), 0.9);
    graphics.strokeTriangle(48, 10, 38, 26, 56, 26);
    graphics.strokeTriangle(PORTRAIT_SIZE - 48, 10, PORTRAIT_SIZE - 56, 26, PORTRAIT_SIZE - 38, 26);
  }
}

function drawBrow(graphics: Phaser.GameObjects.Graphics, variant: PortraitVariant): void {
  graphics.lineStyle(4, blend(variant.skin, 0x121212, 0.6), 0.8);
  switch (variant.browStyle) {
    case "ANGLED":
      graphics.beginPath();
      graphics.moveTo(36, 38);
      graphics.lineTo(46, 34);
      graphics.lineTo(56, 38);
      graphics.strokePath();
      graphics.beginPath();
      graphics.moveTo(PORTRAIT_SIZE - 36, 38);
      graphics.lineTo(PORTRAIT_SIZE - 46, 34);
      graphics.lineTo(PORTRAIT_SIZE - 56, 38);
      graphics.strokePath();
      break;
    case "HEAVY":
      graphics.fillStyle(blend(variant.skin, 0x030303, 0.75), 0.9);
      graphics.fillRoundedRect(32, 34, 32, 8, 4);
      graphics.fillRoundedRect(PORTRAIT_SIZE - 64, 34, 32, 8, 4);
      break;
    case "CURVED":
      graphics.lineStyle(3, blend(variant.skin, 0x0b0b0b, 0.7), 0.8);
      graphics.strokePoints(
        [
          { x: 34, y: 38 },
          { x: 46, y: 32 },
          { x: 58, y: 38 }
        ],
        false,
        true
      );
      graphics.strokePoints(
        [
          { x: PORTRAIT_SIZE - 34, y: 38 },
          { x: PORTRAIT_SIZE - 46, y: 32 },
          { x: PORTRAIT_SIZE - 58, y: 38 }
        ],
        false,
        true
      );
      break;
    default:
      graphics.lineStyle(3, blend(variant.skin, 0x181818, 0.6), 0.8);
      graphics.beginPath();
      graphics.moveTo(34, 38);
      graphics.lineTo(56, 38);
      graphics.strokePath();
      graphics.beginPath();
      graphics.moveTo(PORTRAIT_SIZE - 34, 38);
      graphics.lineTo(PORTRAIT_SIZE - 56, 38);
      graphics.strokePath();
      break;
  }
}

function drawEyes(graphics: Phaser.GameObjects.Graphics, variant: PortraitVariant): void {
  graphics.fillStyle(variant.eyes, 1);
  graphics.fillEllipse(42, 48, 18, 12);
  graphics.fillEllipse(PORTRAIT_SIZE - 42, 48, 18, 12);
  graphics.fillStyle(variant.iris, 1);
  graphics.fillCircle(42, 48, 5);
  graphics.fillCircle(PORTRAIT_SIZE - 42, 48, 5);
  graphics.fillStyle(0x000000, 0.85);
  graphics.fillCircle(42, 48, 2.6);
  graphics.fillCircle(PORTRAIT_SIZE - 42, 48, 2.6);
}

function drawTusks(graphics: Phaser.GameObjects.Graphics, variant: PortraitVariant): void {
  graphics.fillStyle(variant.tusk, 1);
  graphics.fillEllipse(38, 68, 14, 18);
  graphics.fillEllipse(PORTRAIT_SIZE - 38, 68, 14, 18);
  graphics.fillStyle(blend(variant.tusk, 0x111111, 0.4), 0.9);
  graphics.fillEllipse(36, 68, 8, 10);
  graphics.fillEllipse(PORTRAIT_SIZE - 36, 68, 8, 10);
}

function drawMouth(graphics: Phaser.GameObjects.Graphics, variant: PortraitVariant): void {
  const lipColor = blend(variant.skin, 0x090909, 0.7);
  graphics.lineStyle(3, lipColor, 0.9);
  graphics.strokePoints(
    [
      { x: 42, y: 76 },
      { x: PORTRAIT_SIZE / 2, y: 82 },
      { x: PORTRAIT_SIZE - 42, y: 76 }
    ],
    false,
    true
  );
  graphics.lineStyle(2, blend(lipColor, 0xffffff, 0.2), 0.6);
  graphics.strokePoints(
    [
      { x: 42, y: 70 },
      { x: PORTRAIT_SIZE / 2, y: 74 },
      { x: PORTRAIT_SIZE - 42, y: 70 }
    ],
    false,
    true
  );
}

function drawAdornment(graphics: Phaser.GameObjects.Graphics, variant: PortraitVariant): void {
  const { adornment } = variant;
  switch (adornment.kind) {
    case "SCAR": {
      graphics.lineStyle(3, adornment.color, 0.9);
      graphics.beginPath();
      graphics.moveTo(34, 28);
      graphics.lineTo(PORTRAIT_SIZE - 28, PORTRAIT_SIZE - 30);
      graphics.strokePath();
      graphics.lineStyle(1, 0xffffff, 0.6);
      graphics.beginPath();
      graphics.moveTo(36, 30);
      graphics.lineTo(PORTRAIT_SIZE - 30, PORTRAIT_SIZE - 32);
      graphics.strokePath();
      break;
    }
    case "PAINT": {
      graphics.fillStyle(adornment.color, 0.75);
      graphics.fillRect(28, 40, PORTRAIT_SIZE - 56, 14);
      graphics.fillTriangle(28, 54, 40, 78, 52, 54);
      graphics.fillTriangle(PORTRAIT_SIZE - 28, 54, PORTRAIT_SIZE - 40, 78, PORTRAIT_SIZE - 52, 54);
      break;
    }
    case "TATTOO": {
      graphics.lineStyle(3, adornment.color, 0.85);
      graphics.beginPath();
      graphics.moveTo(PORTRAIT_SIZE / 2, 18);
      graphics.lineTo(PORTRAIT_SIZE / 2 - 12, 34);
      graphics.lineTo(PORTRAIT_SIZE / 2 + 12, 34);
      graphics.closePath();
      graphics.strokePath();
      graphics.strokeCircle(PORTRAIT_SIZE / 2, 52, 10);
      break;
    }
    case "PIERCING": {
      graphics.lineStyle(2, adornment.color, 0.9);
      graphics.strokeCircle(PORTRAIT_SIZE / 2, 84, 6);
      graphics.fillStyle(adornment.color, 0.9);
      graphics.fillCircle(PORTRAIT_SIZE / 2 - 8, 84, 3);
      graphics.fillCircle(PORTRAIT_SIZE / 2 + 8, 84, 3);
      break;
    }
    case "HAIR": {
      graphics.fillStyle(adornment.color, 0.95);
      graphics.fillEllipse(PORTRAIT_SIZE / 2, 18, 52, 26);
      graphics.fillRect(28, 24, PORTRAIT_SIZE - 56, 12);
      break;
    }
    case "HELM": {
      graphics.fillStyle(adornment.color, 0.95);
      graphics.fillRect(24, 16, PORTRAIT_SIZE - 48, 18);
      graphics.fillEllipse(PORTRAIT_SIZE / 2, 16, PORTRAIT_SIZE - 40, 28);
      graphics.lineStyle(3, blend(adornment.color, 0xffffff, 0.3), 0.9);
      graphics.strokeRect(24, 16, PORTRAIT_SIZE - 48, 18);
      break;
    }
    case "BRAND": {
      graphics.lineStyle(4, adornment.color, 0.9);
      graphics.strokeRoundedRect(30, 54, PORTRAIT_SIZE - 60, 24, 6);
      graphics.lineStyle(2, blend(adornment.color, 0xffffff, 0.3), 0.6);
      graphics.beginPath();
      graphics.moveTo(36, 66);
      graphics.lineTo(PORTRAIT_SIZE - 36, 66);
      graphics.strokePath();
      break;
    }
    case "MASK": {
      graphics.fillStyle(adornment.color, 0.92);
      graphics.fillRoundedRect(30, 38, PORTRAIT_SIZE - 60, 28, 10);
      graphics.lineStyle(2, blend(adornment.color, 0xffffff, 0.25), 0.9);
      graphics.strokeRoundedRect(30, 38, PORTRAIT_SIZE - 60, 28, 10);
      break;
    }
    default:
      break;
  }
}

function drawPortraitTexture(scene: Phaser.Scene, key: string, variant: PortraitVariant): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(variant.background, 1);
  graphics.fillCircle(PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2);

  const jawColor = blend(variant.jaw, 0x101522, 0.15);
  graphics.fillStyle(jawColor, 1);
  graphics.fillCircle(PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2 + 18, FACE_RADIUS + 6);

  graphics.fillStyle(variant.skin, 1);
  graphics.fillCircle(PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2, FACE_RADIUS);

  drawHorns(graphics, variant);
  drawBrow(graphics, variant);
  drawEyes(graphics, variant);
  drawTusks(graphics, variant);
  drawMouth(graphics, variant);
  drawAdornment(graphics, variant);

  graphics.generateTexture(key, PORTRAIT_SIZE, PORTRAIT_SIZE);
  graphics.destroy();
}

/**
 * Stellt sicher, dass alle prozeduralen Offiziersporträts als Texturen zur Verfügung stehen.
 *
 * @example
 * const keys = ensurePortraitTextures(scene);
 */
export function ensurePortraitTextures(scene: Phaser.Scene): string[] {
  const keys: string[] = [];
  for (let index = 0; index < VARIANT_COUNT; index += 1) {
    const key = `officer-portrait-${index}`;
    if (!scene.textures.exists(key)) {
      drawPortraitTexture(scene, key, VARIANTS[index]);
    }
    keys.push(key);
  }
  return keys;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Bestimmt einen stabilen Portrait-Index anhand einer Offiziers-ID.
 *
 * @example
 * const index = portraitIndexForId(officer.id);
 */
export function portraitIndexForId(id: string): number {
  const raw = Math.abs(hashString(id));
  return raw % VARIANT_COUNT;
}

/**
 * Gesamtzahl der verfügbaren Portraitvarianten.
 */
export function getPortraitVariantCount(): number {
  return VARIANT_COUNT;
}

