/**
 * Universal LPC Spritesheet Type Definitions
 * Based on the Universal LPC Spritesheet Generator standard
 *
 * @see https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
 */

export type LPCDirection = 'U' | 'L' | 'D' | 'R';

/**
 * Standard LPC animations as defined by the Universal LPC Generator
 */
export type LPCAnimation =
  | 'walk' // 9 frames - basic walking animation
  | 'run' // 8 frames - running animation
  | 'idle' // 2 frames - idle/breathing animation
  | 'slash' // 6 frames - slash attack animation
  | 'hurt' // 6 frames - hurt/damage taken animation
  | 'spellcast' // 7 frames - magic casting animation
  | 'thrust' // 8 frames - thrust attack animation
  | 'shoot' // 13 frames - bow/ranged attack animation
  | 'climb' // 6 frames - climbing animation
  | 'jump' // 5 frames - jumping animation
  | 'sit' // 3 frames - sitting animation
  | 'emote' // 3 frames - emote/gesture animation
  | 'combat_idle' // 2 frames - combat ready idle
  | 'backslash' // 13 frames - backhand slash
  | 'halfslash'; // 7 frames - half slash

/**
 * LPC sprite layer definition from character.json
 */
export interface LPCLayer {
  fileName: string;
  zPos: number;
  parentName: string;
  name: string;
  variant: string;
  supportedAnimations: string;
  custom_animation?: string;
}

/**
 * LPC sprite credit information
 */
export interface LPCCredit {
  fileName: string;
  licenses: string;
  authors: string;
  urls: string;
  notes?: string;
}

/**
 * Complete LPC character configuration as exported by the generator
 */
export interface LPCCharacterConfig {
  bodyTypeName: string;
  url: string;
  spritesheets: string;
  version: number;
  datetime: string;
  credits: LPCCredit[];
  layers: LPCLayer[];
}

/**
 * LPC metadata from the generator with animation frame counts
 */
export interface LPCMetadata {
  exportTimestamp: string;
  bodyType: string;
  standardAnimations: {
    exported: string[];
    failed: string[];
  };
  customAnimations: {
    exported: string[];
    failed: string[];
  };
  frameSize: number;
  frameCounts: Record<string, number>;
}

/**
 * Runtime sprite atlas configuration for a single animation
 */
export interface LPCAnimationAtlas {
  url: string;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  frameCount: number;
}

/**
 * Complete LPC character sprite set with all animations
 */
export interface LPCCharacterSprites {
  characterId: string;
  config: LPCCharacterConfig;
  metadata: LPCMetadata;
  atlases: Map<LPCAnimation, LPCAnimationAtlas>;
  images: Map<LPCAnimation, HTMLImageElement>;
}

/**
 * Standard LPC sprite sheet row mapping for directions
 * Based on actual berserker sprite layout (matches legacy atlas.berserker.ts):
 * Row 0: UP (North), Row 1: LEFT (West), Row 2: DOWN (South), Row 3: RIGHT (East)
 */
export const LPC_DIRECTION_ROWS: Record<LPCDirection, number> = {
  U: 0, // Up - Row 0 (North-facing sprites) ✓ verified correct
  L: 1, // Left - Row 1 (West-facing sprites) - corrected to match berserker sprites
  D: 2, // Down - Row 2 (South-facing sprites) - corrected to match berserker sprites
  R: 3  // Right - Row 3 (East-facing sprites) - corrected to match berserker sprites
} as const;

/**
 * Standard frame counts for each LPC animation
 */
export const LPC_FRAME_COUNTS: Record<LPCAnimation, number> = {
  walk: 9,
  run: 8,
  idle: 2,
  slash: 6,
  hurt: 6,
  spellcast: 7,
  thrust: 8,
  shoot: 13,
  climb: 6,
  jump: 5,
  sit: 3,
  emote: 3,
  combat_idle: 2,
  backslash: 13,
  halfslash: 7
} as const;

/**
 * Standard frame timing for LPC animations (milliseconds per frame)
 */
export const LPC_FRAME_TIMING: Record<LPCAnimation, number> = {
  walk: 120,
  run: 100,
  idle: 1000,
  slash: 80,
  hurt: 100,
  spellcast: 120,
  thrust: 100,
  shoot: 80,
  climb: 150,
  jump: 120,
  sit: 300,
  emote: 200,
  combat_idle: 800,
  backslash: 60,
  halfslash: 90
} as const;
