/**
 * Shared types index - exports all common types
 */

// Re-export all common types
export * from './common';
export * from './game';

// Type utilities for convenience
export type { 
  // From common.ts
  EntityId,
  CycleId,
  Position,
  Dimensions,
  Bounds,
  Direction,
  DirectionLong,
  GameMode,
  LoadingState,
  AsyncState,
  BaseEvent,
  AnimationFrame,
  Animation,
  AssetManifest,
  Optional,
  RequiredFields,
  EventHandler,
  CleanupFunction,
  Predicate,
  ComponentProps,
  ModuleConfig,
  AppError,
  Timestamp,
  Duration,
  Result,
  ViewportInfo,
  
  // From game.ts
  Officer,
  OfficerRank,
  OrcArchetype,
  RelationshipType,
  Relationship,
  RelationshipEvent,
  WarcallType,
  Warcall,
  WarcallOutcome,
  WarcallReward,
  WorldState,
  CombatStats,
  CombatAction,
  CombatResult,
  Location,
  LocationType,
  SimulationEvent,
  SimulationEventType,
  SimulationImpact,
  BalanceConfig,
} from './game';