import type { Trait, Officer } from '@sim/types';

/**
 * Modern trait system utilities
 * Handles archetype detection, trait effects, and gameplay mechanics
 */

// Archetype traits that determine combat style
export const ARCHETYPE_TRAITS: Trait[] = ['Archer', 'Trapper'];

// Traits that can be acquired during gameplay
export const ACQUIRABLE_TRAITS: Trait[] = [
  'Robust',
  'Nobel',
  'Primitiv',
  'Unfreundlich',
  'Weise',
  'Guter Schütze',
  'Axtexperte',
  'Jäger'
];

// Physical traits affecting stats
export const PHYSICAL_TRAITS: Trait[] = [
  'Robust',
  'Weich',
  'lange Beine',
  'kurze Beine'
];

// Social traits affecting relationships and merit
export const SOCIAL_TRAITS: Trait[] = [
  'Nobel',
  'Primitiv',
  'Freundlich',
  'Unfreundlich',
  'Geheimnisvoll',
  'Verräter'
];

// Mental traits affecting experience and learning
export const MENTAL_TRAITS: Trait[] = ['Dumm', 'Schlau', 'Weise'];

// Combat specialization traits (archetype-specific)
export const COMBAT_TRAITS: Trait[] = [
  'Guter Schütze',
  'Schlechter Schütze',
  'Axtexperte',
  'Zweihandtölpel',
  'Jäger',
  'Fliegenfänger'
];

/**
 * Derives the archetype from an officer's traits
 * Returns Berserker as default when no archetype trait is present
 */
export function deriveArchetypeFromTraits(
  officer: Officer
): 'Archer' | 'Berserker' | 'Trapper' {
  if (officer.traits.includes('Archer')) {
    return 'Archer';
  }
  if (officer.traits.includes('Trapper')) {
    return 'Trapper';
  }
  return 'Berserker'; // Default archetype
}

/**
 * Checks if a trait is compatible with an officer's archetype
 */
export function isTraitCompatible(trait: Trait, officer: Officer): boolean {
  const archetype = deriveArchetypeFromTraits(officer);

  switch (trait) {
    case 'Guter Schütze':
    case 'Schlechter Schütze':
      return archetype === 'Archer';

    case 'Axtexperte':
    case 'Zweihandtölpel':
      return archetype === 'Berserker';

    case 'Jäger':
    case 'Fliegenfänger':
      return archetype === 'Trapper';

    default:
      return true; // All other traits are universal
  }
}

/**
 * Calculates HP modifier based on physical traits
 */
export function calculateHPModifier(officer: Officer): number {
  let modifier = 1.0;

  if (officer.traits.includes('Robust')) {
    modifier += 0.05; // +5% HP
  }
  if (officer.traits.includes('Weich')) {
    modifier -= 0.05; // -5% HP
  }

  return modifier;
}

/**
 * Calculates Merit modifier based on social traits
 */
export function calculateMeritModifier(officer: Officer): number {
  let modifier = 1.0;

  if (officer.traits.includes('Nobel')) {
    modifier += 0.15; // +15% Merit
  }
  if (officer.traits.includes('Primitiv')) {
    modifier -= 0.15; // -15% Merit
  }

  return modifier;
}

/**
 * Calculates experience gain modifier based on mental traits
 */
export function calculateExperienceModifier(officer: Officer): number {
  let modifier = 1.0;

  if (officer.traits.includes('Schlau')) {
    modifier += 0.25; // +25% experience
  }
  if (officer.traits.includes('Dumm')) {
    modifier -= 0.25; // -25% experience
  }

  return modifier;
}

/**
 * Calculates speed modifier for world map and player mode
 */
export function calculateSpeedModifier(officer: Officer): {
  worldMap: number;
  playerMode: number;
} {
  let worldMapModifier = 1.0;
  let playerModeModifier = 1.0;

  if (officer.traits.includes('lange Beine')) {
    worldMapModifier += 0.1; // +10% world map speed
    playerModeModifier += 0.05; // +5% player mode speed
  }
  if (officer.traits.includes('kurze Beine')) {
    worldMapModifier -= 0.1; // -10% world map speed
    playerModeModifier -= 0.05; // -5% player mode speed
  }

  return { worldMap: worldMapModifier, playerMode: playerModeModifier };
}

/**
 * Gets display-friendly trait names in German
 */
export function getTraitDisplayName(trait: Trait): string {
  const displayNames: Record<Trait, string> = {
    Archer: 'Bogenschütze',
    Trapper: 'Fallensteller',
    Robust: 'Robust',
    Weich: 'Weich',
    'lange Beine': 'Lange Beine',
    'kurze Beine': 'Kurze Beine',
    Nobel: 'Nobel',
    Primitiv: 'Primitiv',
    Freundlich: 'Freundlich',
    Unfreundlich: 'Unfreundlich',
    Geheimnisvoll: 'Geheimnisvoll',
    Dumm: 'Dumm',
    Schlau: 'Schlau',
    Weise: 'Weise',
    Verräter: 'Verräter',
    'Guter Schütze': 'Guter Schütze',
    'Schlechter Schütze': 'Schlechter Schütze',
    Axtexperte: 'Axtexperte',
    Zweihandtölpel: 'Zweihandtölpel',
    Jäger: 'Jäger',
    Fliegenfänger: 'Fliegenfänger'
  };

  return displayNames[trait] || trait;
}

/**
 * Gets trait description for tooltips
 */
export function getTraitDescription(trait: Trait): string {
  const descriptions: Record<Trait, string> = {
    Archer: 'Kampfstil: Fernkampf mit Bogen',
    Trapper: 'Kampfstil: Fallen und Hinterhalte',
    Robust: '+5% Lebenspunkte',
    Weich: '-5% Lebenspunkte',
    'lange Beine': '+10% Weltkarten-Geschwindigkeit, +5% Kampf-Geschwindigkeit',
    'kurze Beine': '-10% Weltkarten-Geschwindigkeit, -5% Kampf-Geschwindigkeit',
    Nobel: '+15% Merit, andere Offiziere sind loyaler',
    Primitiv: '-15% Merit, andere Offiziere sind unloyaler',
    Freundlich: 'Geht gerne Allianzen ein, ist loyaler',
    Unfreundlich: 'Geht gerne Rivalitäten ein, ist unloyaler',
    Geheimnisvoll: 'Sehr ambitioniert, unberechenbar',
    Dumm: '-25% Erfahrungsgewinn',
    Schlau: '+25% Erfahrungsgewinn',
    Weise: 'Mehr Attributpunkte bei Stufenaufstieg',
    Verräter: 'Verrät andere für eigenen Vorteil',
    'Guter Schütze': '+25% Fernkampf-Schaden (nur Bogenschützen)',
    'Schlechter Schütze': '-25% Fernkampf-Schaden (nur Bogenschützen)',
    Axtexperte: '+25% Zweihand-Schaden (nur Berserker)',
    Zweihandtölpel: '-25% Zweihand-Schaden (nur Berserker)',
    Jäger: '+25% Fallen-Schaden (nur Fallensteller)',
    Fliegenfänger: '-25% Fallen-Schaden (nur Fallensteller)'
  };

  return descriptions[trait] || 'Unbekannte Eigenschaft';
}

/**
 * Checks if trait should be visible to player (Geheimnisvoll is hidden)
 */
export function isTraitVisible(trait: Trait): boolean {
  return trait !== 'Geheimnisvoll';
}
