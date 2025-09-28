/**
 * Common types used across the entire application
 * These types should be stable and not frequently changed
 */

// Core entity types
export type EntityId = string;
export type CycleId = number;

// Coordinate types
export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Bounds extends Position, Dimensions {}

// Direction types for sprites and movement
export type Direction = 'U' | 'D' | 'L' | 'R';
export type DirectionLong = 'up' | 'down' | 'left' | 'right';

// Game modes
export type GameMode = 'SPECTATE' | 'PLAYER' | 'FREE_ROAM';

// Common state patterns
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  state: LoadingState;
  data?: T;
  error?: string;
}

// Event types for the event bus
export interface BaseEvent {
  type: string;
  timestamp: number;
  source?: string;
}

// Animation types
export interface AnimationFrame {
  index: number;
  duration: number;
}

export interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
  fps?: number;
}

// Asset types
export interface AssetManifest {
  id: string;
  url: string;
  type: 'image' | 'audio' | 'json' | 'other';
  size?: number;
  loaded?: boolean;
  error?: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Function types
export type EventHandler<T = unknown> = (event: T) => void;
export type CleanupFunction = () => void;
export type Predicate<T> = (item: T) => boolean;

// React-related types
export interface ComponentProps {
  className?: string;
  'data-testid'?: string;
}

// Configuration types
export interface ModuleConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

// Error types
export interface AppError extends Error {
  code?: string;
  context?: Record<string, unknown>;
}

// Time-related types
export type Timestamp = number;
export type Duration = number;

// Generic result type for operations that can fail
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Viewport and UI types
export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}