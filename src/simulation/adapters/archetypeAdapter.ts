/**
 * Adapter for mapping existing archetype data to unified Player Mode archetypes
 * This ensures backward compatibility while normalizing to Archer/Berserker/Trapper
 */

import type { OrcArchetype } from '../archetypes';

/**
 * Maps any existing archetype/class name to one of the three unified archetypes
 * Uses deterministic mapping based on archetype characteristics
 */
export function adaptArchetype(originalArchetype: string): OrcArchetype {
  const normalized = originalArchetype.toLowerCase().trim();

  // Ranged/Archer types
  if (
    normalized.includes('archer') ||
    normalized.includes('bowman') ||
    normalized.includes('marksman') ||
    normalized.includes('sniper') ||
    normalized.includes('hunter') ||
    normalized.includes('ranger')
  ) {
    return 'Archer';
  }

  // Heavy/Berserker types
  if (
    normalized.includes('berserker') ||
    normalized.includes('warrior') ||
    normalized.includes('brute') ||
    normalized.includes('heavy') ||
    normalized.includes('tank') ||
    normalized.includes('guard') ||
    normalized.includes('champion') ||
    normalized.includes('captain')
  ) {
    return 'Berserker';
  }

  // Utility/Trapper types
  if (
    normalized.includes('trapper') ||
    normalized.includes('skirmisher') ||
    normalized.includes('rogue') ||
    normalized.includes('scout') ||
    normalized.includes('assassin') ||
    normalized.includes('utility') ||
    normalized.includes('support')
  ) {
    return 'Trapper';
  }

  // Default fallback with dev warning
  if (typeof console !== 'undefined') {
    console.warn(
      `[ArchetypeAdapter] Unknown archetype "${originalArchetype}", defaulting to Berserker`
    );
  }

  return 'Berserker';
}

/**
 * Batch adapter for arrays of officers or entities
 */
export function adaptArchetypes<T extends { archetype?: string }>(
  entities: T[]
): Array<T & { unifiedArchetype: OrcArchetype }> {
  return entities.map((entity) => ({
    ...entity,
    unifiedArchetype: adaptArchetype(entity.archetype || 'unknown')
  }));
}

/**
 * Get all possible archetype mappings for testing/validation
 */
export function getArchetypeMappings(): Record<string, OrcArchetype> {
  const testCases = [
    'archer',
    'bowman',
    'marksman',
    'sniper',
    'hunter',
    'ranger',
    'berserker',
    'warrior',
    'brute',
    'heavy',
    'tank',
    'guard',
    'champion',
    'captain',
    'trapper',
    'skirmisher',
    'rogue',
    'scout',
    'assassin',
    'utility',
    'support',
    'unknown',
    'weird_type',
    ''
  ];

  const mappings: Record<string, OrcArchetype> = {};
  for (const testCase of testCases) {
    mappings[testCase] = adaptArchetype(testCase);
  }

  return mappings;
}
