/**
 * Test for Berserker sprite direction mapping
 */

import { describe, expect, it } from 'vitest';
import { dirFromAngle } from '../../src/playerMode/systems/orbitMovement';
import { LPC_DIRECTION_ROWS } from '../../src/playerMode/visual/lpc/types';

describe('Berserker Sprite Direction Mapping', () => {
  it('should map movement angles to correct directions', () => {
    // Test basic cardinal directions based on screen coordinates
    // Where positive X is right, positive Y is down

    // Right movement (D key): x=1, y=0 → atan2(0, 1) = 0°
    expect(dirFromAngle(0)).toBe('R');

    // Down movement (S key): x=0, y=1 → atan2(1, 0) = 90°
    expect(dirFromAngle(Math.PI / 2)).toBe('D');

    // Left movement (A key): x=-1, y=0 → atan2(0, -1) = 180°
    expect(dirFromAngle(Math.PI)).toBe('L');

    // Up movement (W key): x=0, y=-1 → atan2(-1, 0) = -90° (normalized to 270°)
    expect(dirFromAngle(-Math.PI / 2)).toBe('U');
    expect(dirFromAngle((3 * Math.PI) / 2)).toBe('U'); // Also 270°
  });

  it('should map directions to correct LPC sprite atlas rows', () => {
    // Test the empirically corrected LPC direction mapping
    // Based on actual berserker sprite behavior:
    // Row 0: UP (correct), Row 1: DOWN, Row 2: RIGHT, Row 3: LEFT

    expect(LPC_DIRECTION_ROWS.U).toBe(0); // Up → Row 0 (verified correct)
    expect(LPC_DIRECTION_ROWS.D).toBe(1); // Down → Row 1 (empirically determined)
    expect(LPC_DIRECTION_ROWS.R).toBe(2); // Right → Row 2 (empirically determined)
    expect(LPC_DIRECTION_ROWS.L).toBe(3); // Left → Row 3 (empirically determined)
  });

  it('should handle diagonal movement directions correctly', () => {
    // Test diagonal directions map to nearest cardinal

    // Northeast (45°) → Right
    expect(dirFromAngle(Math.PI / 4)).toBe('R');

    // Southeast (135°) → Down
    expect(dirFromAngle((3 * Math.PI) / 4)).toBe('D');

    // Southwest (225°) → Up (maps to 225-315° range)
    expect(dirFromAngle((5 * Math.PI) / 4)).toBe('U');

    // Northwest (315°) → Up
    expect(dirFromAngle((7 * Math.PI) / 4)).toBe('U');
  });
});
