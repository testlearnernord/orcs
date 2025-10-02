import { describe, expect, it } from 'vitest';
import { createOfficer } from '@sim/officerFactory';
import { RNG } from '@sim/rng';
import { PROMOTION_THRESHOLDS } from '@sim/constants';

describe('Promotion Thresholds and Grunzer Spawning', () => {
  it('should have correct promotion thresholds for authentic simulation', () => {
    // Verify Grunzer to Späher requires 250 Merit (reduced for easier progression)
    expect(PROMOTION_THRESHOLDS.Grunzer.promoteAt).toBe(250);
    expect(PROMOTION_THRESHOLDS.Grunzer.promoteTo).toBe('Späher');

    // Verify Späher to Captain requires 500 Merit (reduced for easier progression)
    expect(PROMOTION_THRESHOLDS.Späher.promoteAt).toBe(500);
    expect(PROMOTION_THRESHOLDS.Späher.promoteTo).toBe('Captain');
  });

  it('should spawn Grunzer with level 1 and low merit', () => {
    const rng = new RNG('grunzer-spawn-test');
    const grunzer = createOfficer(rng, 'Grunzer', 0);

    // Grunzer must always spawn at level 1
    expect(grunzer.stats.level).toBe(1);

    // Grunzer should have very low merit (around 5, with small variance)
    expect(grunzer.merit).toBeLessThanOrEqual(20);
    expect(grunzer.merit).toBeGreaterThanOrEqual(0);
  });

  it('should spawn multiple Grunzer all at level 1', () => {
    const rng = new RNG('multi-grunzer-test');
    
    // Spawn 10 Grunzer and verify they all start at level 1
    for (let i = 0; i < 10; i++) {
      const grunzer = createOfficer(rng, 'Grunzer', i);
      expect(grunzer.stats.level).toBe(1);
      expect(grunzer.rank).toBe('Grunzer');
    }
  });

  it('should allow Grunzer with low stats but high potential', () => {
    const rng = new RNG('potential-grunzer-test');
    
    // Create several Grunzer to test potential variance
    let hasHighPotential = false;
    for (let i = 0; i < 50; i++) {
      const grunzer = createOfficer(rng, 'Grunzer', i);
      
      // All should be level 1
      expect(grunzer.stats.level).toBe(1);
      
      // Check if any have high potential
      if (
        grunzer.stats.potential === 'Überdurchschnittlich' ||
        grunzer.stats.potential === 'Genie'
      ) {
        hasHighPotential = true;
      }
    }
    
    // Should be possible to spawn Grunzer with high potential
    expect(hasHighPotential).toBe(true);
  });

  it('should spawn higher ranks with appropriately increased levels', () => {
    const rng = new RNG('rank-levels-test');
    
    const grunzer = createOfficer(rng, 'Grunzer', 0);
    const späher = createOfficer(rng, 'Späher', 0);
    const captain = createOfficer(rng, 'Captain', 0);
    const könig = createOfficer(rng, 'König', 0);

    // Verify level progression
    expect(grunzer.stats.level).toBe(1);
    expect(späher.stats.level).toBeGreaterThanOrEqual(4);
    expect(späher.stats.level).toBeLessThanOrEqual(7);
    expect(captain.stats.level).toBeGreaterThanOrEqual(6);
    expect(captain.stats.level).toBeLessThanOrEqual(10);
    expect(könig.stats.level).toBeGreaterThanOrEqual(12);
    expect(könig.stats.level).toBeLessThanOrEqual(14);
  });

  it('should spawn higher ranks with appropriately increased merit', () => {
    const rng = new RNG('rank-merit-test');
    
    const grunzer = createOfficer(rng, 'Grunzer', 0);
    const späher = createOfficer(rng, 'Späher', 0);
    const captain = createOfficer(rng, 'Captain', 0);

    // Verify merit progression (with some variance from base values)
    // Grunzer start with ~5 merit (very low for new recruits)
    expect(grunzer.merit).toBeLessThanOrEqual(20);
    
    // Späher start with ~500 merit (must have earned this to be promoted)
    expect(späher.merit).toBeGreaterThanOrEqual(485);
    expect(späher.merit).toBeLessThanOrEqual(515);
    
    // Captains start with ~1000 merit (must have earned this to be promoted)
    expect(captain.merit).toBeGreaterThanOrEqual(985);
    expect(captain.merit).toBeLessThanOrEqual(1015);
  });
});
