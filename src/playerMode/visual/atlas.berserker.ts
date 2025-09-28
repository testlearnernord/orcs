/**
 * Berserker sprite atlas configuration and utility functions
 * Handles 256px sprite atlases for the berserker archetype
 * 
 * Sprite Direction Convention (Universal LPC Spritesheet Generator):
 * - DOWN  = character facing down (South)
 * - LEFT  = character facing left (West)  
 * - RIGHT = character facing right (East)
 * - UP    = character facing up (North)
 */

export const BERS = {
  walk: {
    url: new URL(
      '../../assets/battlesystem/berserker/walk_256.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 9,
    rows: 4
  },
  run: {
    url: new URL(
      '../../assets/battlesystem/berserker/run_256.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 8,
    rows: 4
  },
  slash: {
    url: new URL(
      '../../assets/battlesystem/berserker/slash_256.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 6,
    rows: 4
  },
  hurt: {
    url: new URL(
      '../../assets/battlesystem/berserker/hurt_256.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 6,
    rows: 4
  },
  // Universal LPC Spritesheet Generator standard mapping:
  // Row 0: RIGHT sprites, Row 1: DOWN sprites, Row 2: UP sprites, Row 3: LEFT sprites
  rowByDir: { D: 1, L: 3, R: 0, U: 2 } as const
} as const;

// Indizes: Walk nutzt Col0 als Idle, Col1..8 als Schritte
export const idxWalk = (
  dir: 'L' | 'R' | 'U' | 'D',
  phase: 'idle' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
) => BERS.rowByDir[dir] * BERS.walk.cols + (phase === 'idle' ? 0 : phase);

export const idxRun = (
  dir: 'L' | 'R' | 'U' | 'D',
  f: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
) => BERS.rowByDir[dir] * BERS.run.cols + f;

export const idxSlash = (
  dir: 'L' | 'R' | 'U' | 'D',
  f: 0 | 1 | 2 | 3 | 4 | 5
) => BERS.rowByDir[dir] * BERS.slash.cols + f;

export const idxHurt = (dir: 'L' | 'R' | 'U' | 'D', f: 0 | 1 | 2 | 3 | 4 | 5) =>
  BERS.rowByDir[dir] * BERS.hurt.cols + f;
