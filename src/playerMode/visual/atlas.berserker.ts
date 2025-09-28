/**
 * Berserker sprite atlas configuration and utility functions
 * Handles 256px sprite atlases for the berserker archetype
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
  rowByDir: { D: 2, L: 3, R: 1, U: 0 } as const
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
