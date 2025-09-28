/**
 * Test for Berserker sprite direction mapping
 */

import { describe, expect, it } from 'vitest';
import { dirFromAngle } from '../../src/playerMode/systems/orbitMovement';
import { idxWalk, BERS } from '../../src/playerMode/visual/atlas.berserker';

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
    expect(dirFromAngle(3 * Math.PI / 2)).toBe('U'); // Also 270°
  });

  it('should map directions to correct sprite atlas rows', () => {
    // Test that our rowByDir mapping matches LPC standard
    const { rowByDir } = BERS;
    
    expect(rowByDir.D).toBe(0); // Down → Row 0 (South)
    expect(rowByDir.L).toBe(1); // Left → Row 1 (West)  
    expect(rowByDir.R).toBe(2); // Right → Row 2 (East)
    expect(rowByDir.U).toBe(3); // Up → Row 3 (North)
  });

  it('should generate correct frame indices for walking', () => {
    // Test walk frame calculation
    expect(idxWalk('D', 'idle')).toBe(0); // Down idle → Row 0, Col 0
    expect(idxWalk('L', 'idle')).toBe(9); // Left idle → Row 1, Col 0 (1*9 + 0)
    expect(idxWalk('R', 'idle')).toBe(18); // Right idle → Row 2, Col 0 (2*9 + 0)
    expect(idxWalk('U', 'idle')).toBe(27); // Up idle → Row 3, Col 0 (3*9 + 0)
    
    // Test walk frame 1
    expect(idxWalk('D', 1)).toBe(1); // Down walk frame 1 → Row 0, Col 1
    expect(idxWalk('L', 1)).toBe(10); // Left walk frame 1 → Row 1, Col 1
    expect(idxWalk('R', 1)).toBe(19); // Right walk frame 1 → Row 2, Col 1
    expect(idxWalk('U', 1)).toBe(28); // Up walk frame 1 → Row 3, Col 1
  });

  it('should handle diagonal movement directions correctly', () => {
    // Test diagonal directions map to nearest cardinal
    
    // Northeast (45°) → Right
    expect(dirFromAngle(Math.PI / 4)).toBe('R');
    
    // Southeast (135°) → Down  
    expect(dirFromAngle(3 * Math.PI / 4)).toBe('D');
    
    // Southwest (225°) → Up (closest to 270°)
    expect(dirFromAngle(5 * Math.PI / 4)).toBe('U');
    
    // Northwest (315°) → Up
    expect(dirFromAngle(7 * Math.PI / 4)).toBe('U');
  });
});