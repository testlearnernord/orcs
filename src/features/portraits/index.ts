/**
 * Portraits feature module
 * Consolidates portrait loading, configuration, and display logic
 */

// Re-export from existing locations for now (transition period)
export * from '../../ui/portraits/config';
export * from '../../ui/portraits/loader';
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
