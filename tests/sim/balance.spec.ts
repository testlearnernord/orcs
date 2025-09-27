import { describe, expect, it } from 'vitest';
import { advanceCycle } from '@sim/cycle';
import { createWorld } from '@sim/world';
import { RNG } from '@sim/rng';

describe('Simulation Balance', () => {
  it('should have reasonable death rates and proper spawning behavior', () => {
    const seed = 'balance-test-2024';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    let totalDeaths = 0;
    let kingChanges = 0;
    let currentKing = state.kingId;
    let nonGrunzerSpawns = 0;

    // Run simulation for 30 cycles
    for (let i = 0; i < 30; i++) {
      const summary = advanceCycle(state, rng);
      totalDeaths += summary.deaths.length;
      
      // Track king changes
      if (state.kingId !== currentKing) {
        kingChanges++;
        currentKing = state.kingId;
      }
      
      // Verify all new spawns are Grunzer only
      summary.spawns.forEach(spawn => {
        if (spawn.rank !== 'Grunzer') {
          nonGrunzerSpawns++;
        }
      });
    }

    // Balanced expectations - much improved death rate
    expect(totalDeaths).toBeLessThan(20); // Much reduced from ~140
    expect(totalDeaths).toBeGreaterThan(0); // Some risk needed, but much lower
    
    // King should be more stable
    expect(kingChanges).toBeLessThan(4); // Previously would die in 3 days
    
    // All spawns should be Grunzer
    expect(nonGrunzerSpawns).toBe(0);
    
    // Should maintain proper officer count
    expect(state.officers.length).toBe(20);
    
    // Should have proper rank distribution (higher ranks filled by promotion)
    const ranks = state.officers.reduce((acc, officer) => {
      acc[officer.rank] = (acc[officer.rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    expect(ranks['König']).toBe(1);
    expect(ranks['Captain']).toBeGreaterThan(0); // Should have some captains from promotions
    expect(ranks['Späher']).toBeGreaterThan(0); // Should have some scouts from promotions
  });

  it('should have improved warcall success rates', () => {
    const seed = 'warcall-balance-test';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    let totalWarcalls = 0;
    let successfulWarcalls = 0;

    // Run for 20 cycles to get good sample size
    for (let i = 0; i < 20; i++) {
      const summary = advanceCycle(state, rng);
      
      summary.warcallsResolved.forEach(resolution => {
        totalWarcalls++;
        if (resolution.success) {
          successfulWarcalls++;
        }
      });
    }

    // Should have reasonable success rate (improved from original)
    const successRate = successfulWarcalls / totalWarcalls;
    expect(successRate).toBeGreaterThan(0.4); // At least 40% success rate
    expect(successRate).toBeLessThan(0.8); // But not too easy
    expect(totalWarcalls).toBeGreaterThan(15); // Should have meaningful sample
  });
});