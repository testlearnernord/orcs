/**
 * Universal LPC Sprite System
 *
 * Complete implementation of the Universal LPC Spritesheet Generator standard
 * for player mode character rendering with proper layering and animations.
 */

export * from './types';
export * from './animator';
export * from './loader';
export * from './renderer';

// Re-export commonly used types for convenience
export type {
  LPCAnimation,
  LPCDirection,
  LPCCharacterConfig,
  LPCMetadata,
  LPCCharacterSprites
} from './types';

export { LPCAnimator } from './animator';
export { LPCCharacterLoader } from './loader';
export { LPCRenderer } from './renderer';
