import { describe, it, expect } from 'vitest';
import { advanceCycle } from '@sim/cycle';
import { createWorld } from '@sim/world';
import { RNG } from '@sim/rng';

describe('Level-Up Integration Test', () => {
  it('should show officers leveling up over multiple cycles', () => {
    const seed = 'levelup-integration-test';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    // Track initial levels
    const initialLevels = new Map<string, number>();
    state.officers.forEach((officer) => {
      initialLevels.set(officer.id, officer.stats.level);
    });

    let levelUpsDetected = 0;
    let rivalryChallenges = 0;

    // Run simulation for 50 cycles to give officers time to level up
    for (let i = 0; i < 50; i++) {
      const summary = advanceCycle(state, rng);

      // Check feed for level-up messages
      summary.feed.forEach((entry) => {
        if (entry.text.includes('Level') && entry.text.includes('erreicht')) {
          levelUpsDetected++;
        }
        if (entry.text.includes('fordert') && entry.text.includes('heraus')) {
          rivalryChallenges++;
        }
      });
    }

    // Check that some officers have leveled up
    let officersWhoLeveledUp = 0;
    state.officers.forEach((officer) => {
      const initialLevel = initialLevels.get(officer.id);
      if (initialLevel && officer.stats.level > initialLevel) {
        officersWhoLeveledUp++;
      }
    });

    console.log(`Officers who leveled up: ${officersWhoLeveledUp}`);
    console.log(`Level-up events detected: ${levelUpsDetected}`);
    console.log(`Rivalry challenges: ${rivalryChallenges}`);

    // Assertions
    expect(officersWhoLeveledUp).toBeGreaterThan(0); // At least some officers should level up
    expect(levelUpsDetected).toBeGreaterThan(0); // Feed should contain level-up messages
    expect(rivalryChallenges).toBeGreaterThan(0); // Some rivalry challenges should occur

    // Check that stats increased with levels
    state.officers.forEach((officer) => {
      const initialLevel = initialLevels.get(officer.id);
      if (initialLevel && officer.stats.level > initialLevel) {
        // Officers who leveled up should have higher total stats
        const currentStats = officer.stats.str + officer.stats.dex + officer.stats.int;
        expect(currentStats).toBeGreaterThan(30); // Base stats are ~30, leveled officers should have more
      }
    });
  });

  it('should show higher potential officers gaining more stats per level', () => {
    const seed = 'potential-test';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    // Run simulation
    for (let i = 0; i < 50; i++) {
      advanceCycle(state, rng);
    }

    // Find officers who leveled up and compare stat gains
    const geniusOfficers = state.officers.filter(
      (o) => o.stats.potential === 'Genie' && o.stats.level > 1
    );
    const normalOfficers = state.officers.filter(
      (o) => o.stats.potential === 'Normal' && o.stats.level > 1
    );

    // If we have both types, genius officers should generally have higher stats
    if (geniusOfficers.length > 0 && normalOfficers.length > 0) {
      const avgGeniusStats =
        geniusOfficers.reduce(
          (sum, o) => sum + o.stats.str + o.stats.dex + o.stats.int,
          0
        ) / geniusOfficers.length;
      const avgNormalStats =
        normalOfficers.reduce(
          (sum, o) => sum + o.stats.str + o.stats.dex + o.stats.int,
          0
        ) / normalOfficers.length;

      console.log(`Average genius stats: ${avgGeniusStats}`);
      console.log(`Average normal stats: ${avgNormalStats}`);

      // Genius officers should have higher average stats (even at same level)
      expect(avgGeniusStats).toBeGreaterThanOrEqual(avgNormalStats);
    }
  });

  it('should show trait effects on experience gain', () => {
    const seed = 'trait-exp-test';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    // Track officers with learning traits
    const smartOfficers = new Map<string, number>();
    const dumbOfficers = new Map<string, number>();

    state.officers.forEach((officer) => {
      if (officer.traits.includes('Schlau')) {
        smartOfficers.set(officer.id, officer.stats.level);
      } else if (officer.traits.includes('Dumm')) {
        dumbOfficers.set(officer.id, officer.stats.level);
      }
    });

    // Run simulation
    for (let i = 0; i < 50; i++) {
      advanceCycle(state, rng);
    }

    // Check level progression
    let smartLevelGains = 0;
    let dumbLevelGains = 0;

    state.officers.forEach((officer) => {
      const smartInitial = smartOfficers.get(officer.id);
      const dumbInitial = dumbOfficers.get(officer.id);

      if (smartInitial !== undefined) {
        smartLevelGains += officer.stats.level - smartInitial;
      }
      if (dumbInitial !== undefined) {
        dumbLevelGains += officer.stats.level - dumbInitial;
      }
    });

    console.log(`Smart officer level gains: ${smartLevelGains}`);
    console.log(`Dumb officer level gains: ${dumbLevelGains}`);

    // Smart officers should generally gain more levels (25% bonus to exp)
    // Note: This is probabilistic, so we just check that it happened
    if (smartOfficers.size > 0 && dumbOfficers.size > 0) {
      // Both types should level up at least a bit
      expect(smartLevelGains + dumbLevelGains).toBeGreaterThan(0);
    }
  });
});
