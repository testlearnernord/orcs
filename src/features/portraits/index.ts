/**
 * Portraits feature module
 * Consolidates portrait loading, configuration, and display logic
 */

// Re-export from current locations
export * from './config';
export * from './loader';
export { default as OfficerAvatar } from './Avatar';

// Feature types
export interface PortraitFeatureConfig {
  enabled: boolean;
  preloadAllAtlases: boolean;
  fallbackToRemote: boolean;
  cacheAtlases: boolean;
}

export const DEFAULT_PORTRAIT_CONFIG: PortraitFeatureConfig = {
  enabled: true,
  preloadAllAtlases: false,
  fallbackToRemote: true,
  cacheAtlases: true
};
