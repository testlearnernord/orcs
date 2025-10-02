import { describe, it, expect } from 'vitest';
import { RNG } from '@sim/rng';
import { createOfficer } from '@sim/officerFactory';
import {
  getExpForLevel,
  getCurrentExp,
  processLevelUp,
  processAllLevelUps
} from '@sim/experience';
import type { Officer } from '@sim/types';

describe('Officer Experience and Level-Up System', () => {
  const rng = new RNG('test-seed');

  it('should calculate correct experience thresholds for levels', () => {
    expect(getExpForLevel(1)).toBe(100); // 1^2 * 100
    expect(getExpForLevel(2)).toBe(400); // 2^2 * 100
    expect(getExpForLevel(3)).toBe(900); // 3^2 * 100
    expect(getExpForLevel(5)).toBe(2500); // 5^2 * 100
    expect(getExpForLevel(10)).toBe(10000); // 10^2 * 100
  });

  it('should calculate current experience from merit', () => {
    const officer = createOfficer(rng, 'Grunzer', 0, {
      merit: 100
    });

    const exp = getCurrentExp(officer);
    
    // Should have base exp for level 1 (100) + merit bonus
    expect(exp).toBeGreaterThan(100);
  });

  it('should apply trait modifiers to experience gain', () => {
    const smartOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 100,
      traits: ['Schlau']
    });

    const dumbOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 100,
      traits: ['Dumm']
    });

    const normalOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 100,
      traits: []
    });

    const smartExp = getCurrentExp(smartOfficer);
    const dumbExp = getCurrentExp(dumbOfficer);
    const normalExp = getCurrentExp(normalOfficer);

    // Smart officers should gain more exp
    expect(smartExp).toBeGreaterThan(normalExp);
    
    // Dumb officers should gain less exp
    expect(dumbExp).toBeLessThan(normalExp);
  });

  it('should level up officer when they have enough experience', () => {
    // Create a Grunzer with high merit to trigger level-up
    const officer = createOfficer(rng, 'Grunzer', 0, {
      merit: 500, // High merit should give enough exp to level up
      stats: {
        potential: 'Normal',
        level: 1,
        hp: 60,
        maxHp: 60,
        str: 10,
        dex: 10,
        int: 10
      }
    });

    const result = processLevelUp(officer, rng, 1);

    // Should have leveled up
    expect(result.officer.stats.level).toBeGreaterThan(officer.stats.level);
    
    // Stats should have increased
    expect(
      result.officer.stats.str +
      result.officer.stats.dex +
      result.officer.stats.int
    ).toBeGreaterThan(
      officer.stats.str + officer.stats.dex + officer.stats.int
    );

    // HP should have increased
    expect(result.officer.stats.maxHp).toBeGreaterThan(officer.stats.maxHp);

    // Should have feed entry
    expect(result.feed).toBeDefined();
    expect(result.feed?.text).toContain('Level');
  });

  it('should not level up officer without enough experience', () => {
    const officer = createOfficer(rng, 'Grunzer', 0, {
      merit: 0, // No merit, not enough exp
      stats: {
        potential: 'Normal',
        level: 1,
        hp: 60,
        maxHp: 60,
        str: 10,
        dex: 10,
        int: 10
      }
    });

    const result = processLevelUp(officer, rng, 1);

    // Should not have leveled up
    expect(result.officer.stats.level).toBe(officer.stats.level);
    
    // Should not have feed entry
    expect(result.feed).toBeUndefined();
  });

  it('should give more stat points to officers with higher potential', () => {
    const geniusOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 500,
      stats: {
        potential: 'Genie',
        level: 1,
        hp: 60,
        maxHp: 60,
        str: 10,
        dex: 10,
        int: 10
      }
    });

    const normalOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 500,
      stats: {
        potential: 'Normal',
        level: 1,
        hp: 60,
        maxHp: 60,
        str: 10,
        dex: 10,
        int: 10
      }
    });

    const geniusResult = processLevelUp(geniusOfficer, rng.fork('genius'), 1);
    const normalResult = processLevelUp(normalOfficer, rng.fork('normal'), 1);

    // Both should level up
    expect(geniusResult.officer.stats.level).toBe(2);
    expect(normalResult.officer.stats.level).toBe(2);

    // Genius should gain more stats
    const geniusStatGain =
      (geniusResult.officer.stats.str - geniusOfficer.stats.str) +
      (geniusResult.officer.stats.dex - geniusOfficer.stats.dex) +
      (geniusResult.officer.stats.int - geniusOfficer.stats.int);

    const normalStatGain =
      (normalResult.officer.stats.str - normalOfficer.stats.str) +
      (normalResult.officer.stats.dex - normalOfficer.stats.dex) +
      (normalResult.officer.stats.int - normalOfficer.stats.int);

    expect(geniusStatGain).toBeGreaterThan(normalStatGain);
  });

  it('should process level-ups for all officers', () => {
    const officers: Officer[] = [
      createOfficer(rng, 'Grunzer', 0, { merit: 500 }),
      createOfficer(rng, 'Späher', 0, { merit: 600 }),
      createOfficer(rng, 'Captain', 0, { merit: 700 })
    ];

    const result = processAllLevelUps(officers, rng, 1);

    // Should have processed all officers
    expect(result.officers.length).toBe(3);

    // Some officers should have leveled up
    expect(result.levelUps.length).toBeGreaterThan(0);

    // Feed entries should be created for level-ups
    expect(result.feed.length).toBe(result.levelUps.length);
  });

  it('should give "Weise" trait extra stat points on level-up', () => {
    const wiseOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 500,
      traits: ['Weise'],
      stats: {
        potential: 'Normal',
        level: 1,
        hp: 60,
        maxHp: 60,
        str: 10,
        dex: 10,
        int: 10
      }
    });

    const normalOfficer = createOfficer(rng, 'Grunzer', 0, {
      merit: 500,
      traits: [],
      stats: {
        potential: 'Normal',
        level: 1,
        hp: 60,
        maxHp: 60,
        str: 10,
        dex: 10,
        int: 10
      }
    });

    const wiseResult = processLevelUp(wiseOfficer, rng.fork('wise'), 1);
    const normalResult = processLevelUp(normalOfficer, rng.fork('normal'), 1);

    // Wise officer should gain more stats
    const wiseStatGain =
      (wiseResult.officer.stats.str - wiseOfficer.stats.str) +
      (wiseResult.officer.stats.dex - wiseOfficer.stats.dex) +
      (wiseResult.officer.stats.int - wiseOfficer.stats.int);

    const normalStatGain =
      (normalResult.officer.stats.str - normalOfficer.stats.str) +
      (normalResult.officer.stats.dex - normalOfficer.stats.dex) +
      (normalResult.officer.stats.int - normalOfficer.stats.int);

    expect(wiseStatGain).toBeGreaterThan(normalStatGain);
  });
});
