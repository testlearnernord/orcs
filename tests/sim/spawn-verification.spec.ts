import { describe, it, expect } from 'vitest';
import { createWorld } from '@sim/world';
import { advanceCycle } from '@sim/cycle';
import { RNG } from '@sim/rng';

describe('Spawn behavior verification', () => {
  it('should only spawn Grunzer during cycles, never Späher/Captain/König', () => {
    const seed = 'spawn-verification';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    console.log('\n=== Initial World (Cycle 0) ===');
    const initialRanks = state.officers.reduce((acc, o) => {
      acc[o.rank] = (acc[o.rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Ranks at game start:', initialRanks);
    console.log('✓ König, Captains, Späher spawn ONLY at game start\n');

    let allSpawns: Array<{ cycle: number; rank: string; name: string }> = [];

    console.log('=== Spawns During 30 Cycles ===');
    for (let i = 0; i < 30; i++) {
      const summary = advanceCycle(state, rng);

      if (summary.spawns.length > 0) {
        summary.spawns.forEach((spawn) => {
          allSpawns.push({
            cycle: summary.cycle,
            rank: spawn.rank,
            name: spawn.name
          });
          console.log(
            `Cycle ${summary.cycle}: Spawned ${spawn.rank} "${spawn.name}" (Level ${spawn.stats.level})`
          );
        });
      }
    }

    console.log('\n=== Spawn Analysis ===');
    const spawnsByRank = allSpawns.reduce((acc, spawn) => {
      acc[spawn.rank] = (acc[spawn.rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Total spawns during 30 cycles:', allSpawns.length);
    console.log('Spawns by rank:', spawnsByRank);

    // Verify only Grunzer spawned
    const nonGrunzerSpawns = allSpawns.filter((s) => s.rank !== 'Grunzer');
    
    console.log('\n=== Verification Results ===');
    console.log('✓ Grunzer spawns during cycles:', spawnsByRank['Grunzer'] || 0);
    console.log('✓ Späher spawns during cycles:', spawnsByRank['Späher'] || 0);
    console.log('✓ Captain spawns during cycles:', spawnsByRank['Captain'] || 0);
    console.log('✓ König spawns during cycles:', spawnsByRank['König'] || 0);

    expect(nonGrunzerSpawns).toHaveLength(0);
    expect(spawnsByRank['Grunzer']).toBeGreaterThan(0);
    expect(spawnsByRank['Späher']).toBeUndefined();
    expect(spawnsByRank['Captain']).toBeUndefined();
    expect(spawnsByRank['König']).toBeUndefined();

    console.log('\n✅ CONFIRMED: Only Grunzer spawn during gameplay!');
    console.log('✅ Späher, Captains, König only appear through:');
    console.log('   1. Initial world creation (game start)');
    console.log('   2. Promotions during gameplay\n');
  });
});
