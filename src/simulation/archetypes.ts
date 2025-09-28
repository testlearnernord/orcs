/**
 * Core archetype system for unified Player Mode combat
 * Defines the three main orc types and their balance values
 */

export type OrcArchetype = 'Archer' | 'Berserker' | 'Trapper';

export const ARCHETYPES: OrcArchetype[] = ['Archer', 'Berserker', 'Trapper'];

/**
 * Balance constants for all combat mechanics
 */
export const BALANCE = {
  // Stamina system
  staminaMax: 100,
  staminaRegenPerSec: 18,
  regenDelayMs: 650,

  // Dash mechanics
  dash: {
    cost: 22,
    iframeMs: 120,
    speedMul: 2.4,
    durMs: 180
  },

  // Block mechanics
  block: {
    drainPerHit: 18,
    minCost: 6,
    angleDeg: 110
  }
} as const;

/**
 * Signature move definitions for each archetype
 */
export const SIGNATURE = {
  Archer: {
    name: 'Volley',
    arrows: 5,
    spreadDeg: 16,
    dmgPer: 12,
    cooldown: 9,
    staminaCost: 28,
    slightAutoAim: true
  },

  Berserker: {
    name: 'Rage Cleave',
    radius: 1.6,
    dmg: 35,
    stagger: 0.8,
    windupMs: 250,
    cooldown: 8,
    staminaCost: 30
  },

  Trapper: {
    name: 'Snap Trap',
    placeTimeMs: 200,
    armMs: 150,
    rootMs: 1200,
    dmg: 20,
    cooldown: 10,
    staminaCost: 24,
    maxActive: 2
  }
} as const;

/**
 * Base stats for each archetype
 */
export const ARCHETYPE_STATS = {
  Archer: {
    health: 80,
    speed: 1.2,
    damage: 15,
    range: 3.0
  },

  Berserker: {
    health: 120,
    speed: 0.9,
    damage: 25,
    range: 1.2
  },

  Trapper: {
    health: 90,
    speed: 1.1,
    damage: 18,
    range: 1.8
  }
} as const;
