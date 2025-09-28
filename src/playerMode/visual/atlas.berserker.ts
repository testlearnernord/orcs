/**
 * @deprecated This file is deprecated. Use the Universal LPC Sprite System instead.
 * @see src/playerMode/visual/lpc/ for the new LPC-compliant sprite system
 *
 * Legacy berserker sprite atlas configuration and utility functions
 * This file remains for backwards compatibility but will be removed in a future version.
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
      '../../assets/battlesystem/berserker/standard/walk.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 9,
    rows: 4
  },
  run: {
    url: new URL(
      '../../assets/battlesystem/berserker/standard/run.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 8,
    rows: 4
  },
  slash: {
    url: new URL(
      '../../assets/battlesystem/berserker/standard/slash.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 6,
    rows: 4
  },
  hurt: {
    url: new URL(
      '../../assets/battlesystem/berserker/standard/hurt.png',
      import.meta.url
    ).toString(),
    w: 256,
    h: 256,
    cols: 6,
    rows: 4
  },
  // Empirically determined mapping based on actual sprite layout:
  // Row 1: DOWN sprites (verified correct)
  // Row 3: LEFT sprites (was correct in original)
  // Row 0: UP sprites (needs verification)
  // Row 2: RIGHT sprites (needs verification)
  rowByDir: { D: 1, L: 3, R: 2, U: 0 } as const
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
