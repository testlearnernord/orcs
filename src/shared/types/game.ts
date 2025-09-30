/**
 * Game-specific types for Orcs simulation and gameplay
 */

import type { EntityId, Position, Direction } from './common';

// Officer/Unit types
export interface Officer {
  id: EntityId;
  name: string;
  traits: string[];
  position: Position;
  rank: OfficerRank;
  archetype: OrcArchetype;
  health: number;
  maxHealth: number;
  experience: number;
  level: number;
  isDead: boolean;
  deathCycle?: number;
}

export type OfficerRank = 'GRUNT' | 'SCOUT' | 'CAPTAIN' | 'KING';

export type OrcArchetype =
  | 'BERSERKER'
  | 'SHAMAN'
  | 'SCOUT'
  | 'GUARDIAN'
  | 'ASSASSIN';

// Relationship types (simplified as per requirements)
export type RelationshipType = 'ALLY' | 'RIVAL';

export interface Relationship {
  officerId1: EntityId;
  officerId2: EntityId;
  type: RelationshipType;
  strength: number; // 0-100
  history: RelationshipEvent[];
}

export interface RelationshipEvent {
  type: 'FORMED' | 'STRENGTHENED' | 'WEAKENED' | 'CHANGED';
  cycle: number;
  reason: string;
}

// Warcall types
export type WarcallType =
  | 'HUNT'
  | 'FEAST'
  | 'RAID'
  | 'ASSASSINATION'
  | 'INTRIGUE'
  | 'RECRUITMENT';

export interface Warcall {
  id: EntityId;
  type: WarcallType;
  initiator: EntityId;
  participants: EntityId[];
  location: Position;
  cycle: number;
  outcome?: WarcallOutcome;
  rewards?: WarcallReward[];
}

export interface WarcallOutcome {
  success: boolean;
  casualties: EntityId[];
  promotions: EntityId[];
  loot: string[];
  fame: Record<EntityId, number>;
}

export interface WarcallReward {
  officerId: EntityId;
  type: 'PROMOTION' | 'ITEM' | 'FAME' | 'EXPERIENCE';
  value: string | number;
}

// World/Simulation types
export interface WorldState {
  cycle: number;
  officers: Record<EntityId, Officer>;
  relationships: Relationship[];
  activeWarcalls: Warcall[];
  kingId?: EntityId;
  population: {
    grunts: number;
    scouts: number;
    captains: number;
  };
  resources: {
    gold: number;
    food: number;
    weapons: number;
  };
}

// Combat types (for player mode)
export interface CombatStats {
  attack: number;
  defense: number;
  speed: number;
  accuracy: number;
  criticalChance: number;
  dodgeChance: number;
}

export interface CombatAction {
  type: 'ATTACK' | 'DEFEND' | 'DODGE' | 'SPECIAL';
  damage?: number;
  target?: EntityId;
  direction?: Direction;
  animation?: string;
}

export interface CombatResult {
  attacker: EntityId;
  target: EntityId;
  action: CombatAction;
  damage: number;
  blocked: boolean;
  critical: boolean;
  effects: string[];
}

// Map/Location types
export interface Location {
  id: EntityId;
  name: string;
  position: Position;
  type: LocationType;
  capacity: number;
  currentOccupants: EntityId[];
  resources?: string[];
}

export type LocationType =
  | 'STRONGHOLD'
  | 'VILLAGE'
  | 'WILDERNESS'
  | 'DUNGEON'
  | 'THRONE_ROOM';

// Event types for simulation
export interface SimulationEvent {
  id: EntityId;
  type: SimulationEventType;
  cycle: number;
  participants: EntityId[];
  location?: EntityId;
  description: string;
  impact: SimulationImpact[];
}

export type SimulationEventType =
  | 'OFFICER_DEATH'
  | 'OFFICER_PROMOTION'
  | 'RELATIONSHIP_FORMED'
  | 'RELATIONSHIP_CHANGED'
  | 'WARCALL_INITIATED'
  | 'WARCALL_COMPLETED'
  | 'KING_CROWNED'
  | 'KING_DETHRONED'
  | 'REBELLION'
  | 'ALLIANCE_FORMED';

export interface SimulationImpact {
  type:
    | 'STAT_CHANGE'
    | 'RELATIONSHIP_CHANGE'
    | 'INVENTORY_CHANGE'
    | 'LOCATION_CHANGE';
  target: EntityId;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Balance configuration types
export interface BalanceConfig {
  populationLimits: {
    king: number;
    captains: number;
    scouts: number;
    officers: number;
    grunts: number;
  };
  promotionRequirements: {
    experience: Record<OfficerRank, number>;
    fame: Record<OfficerRank, number>;
    survivedCycles: Record<OfficerRank, number>;
  };
  warcallFrequency: {
    baseChance: number;
    cooldown: number;
    participantLimits: Record<WarcallType, number>;
  };
  relationshipDecay: {
    baseRate: number;
    distanceModifier: number;
    timeModifier: number;
  };
}
