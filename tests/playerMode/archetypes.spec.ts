import { describe, expect, it, vi } from 'vitest';
import {
  ARCHETYPES,
  BALANCE,
  SIGNATURE,
  ARCHETYPE_STATS
} from '../../src/simulation/archetypes';
import { adaptArchetype } from '../../src/simulation/adapters/archetypeAdapter';

describe('player-mode archetypes system', () => {
  it('should have exactly three archetypes', () => {
    expect(ARCHETYPES).toHaveLength(3);
    expect(ARCHETYPES).toEqual(['Archer', 'Berserker', 'Trapper']);
  });

  it('should have balanced stamina system', () => {
    expect(BALANCE.staminaMax).toBeGreaterThan(0);
    expect(BALANCE.staminaRegenPerSec).toBeGreaterThan(0);
    expect(BALANCE.regenDelayMs).toBeGreaterThan(0);
  });

  it('should have signature moves for all archetypes', () => {
    for (const archetype of ARCHETYPES) {
      expect(SIGNATURE[archetype]).toBeDefined();
      expect(SIGNATURE[archetype].cooldown).toBeGreaterThan(0);
      expect(SIGNATURE[archetype].staminaCost).toBeGreaterThan(0);
    }
  });

  it('should have stats for all archetypes', () => {
    for (const archetype of ARCHETYPES) {
      const stats = ARCHETYPE_STATS[archetype];
      expect(stats.health).toBeGreaterThan(0);
      expect(stats.speed).toBeGreaterThan(0);
      expect(stats.damage).toBeGreaterThan(0);
      expect(stats.range).toBeGreaterThan(0);
    }
  });

  it('should adapt unknown archetypes to Berserker with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = adaptArchetype('unknown_type');
    expect(result).toBe('Berserker');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Unknown archetype "unknown_type", defaulting to Berserker'
      )
    );

    consoleSpy.mockRestore();
  });

  it('should correctly map known archetype patterns', () => {
    expect(adaptArchetype('archer')).toBe('Archer');
    expect(adaptArchetype('bowman')).toBe('Archer');
    expect(adaptArchetype('berserker')).toBe('Berserker');
    expect(adaptArchetype('warrior')).toBe('Berserker');
    expect(adaptArchetype('trapper')).toBe('Trapper');
    expect(adaptArchetype('rogue')).toBe('Trapper');
  });
});
