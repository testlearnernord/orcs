/**
 * Feature flags system for controlling application features
 * Supports environment-based configuration and runtime toggles
 */

interface FeatureFlags {
  // Development features
  DEV_OVERLAY: boolean;
  DEV_DEBUG_TOOLS: boolean;
  DEV_PERFORMANCE_MONITORING: boolean;
  
  // Game mode features
  PLAYER_MODE_ENABLED: boolean;
  SPECTATE_MODE_ENABLED: boolean;
  FREE_ROAM_ENABLED: boolean;
  
  // Simulation features
  ENHANCED_AI_LOGIC: boolean;
  ADVANCED_RELATIONSHIPS: boolean;
  WARCALL_SYSTEM: boolean;
  
  // Combat features
  LOCK_ON_SYSTEM: boolean;
  SIGNATURE_MOVES: boolean;
  ADVANCED_PHYSICS: boolean;
  
  // Audio/Visual features
  AUDIO_ENABLED: boolean;
  PORTRAIT_ATLASES: boolean;
  SPRITE_ANIMATIONS: boolean;
  
  // Performance features
  LAZY_LOADING: boolean;
  CODE_SPLITTING: boolean;
  BUNDLE_ANALYSIS: boolean;
}

/**
 * Environment-based feature flag configuration
 */
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  const isDev = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  
  return {
    // Dev features only in development
    DEV_OVERLAY: isDev,
    DEV_DEBUG_TOOLS: isDev,
    DEV_PERFORMANCE_MONITORING: isDev,
    
    // Performance features enabled by default in production
    LAZY_LOADING: isProduction,
    CODE_SPLITTING: isProduction,
    BUNDLE_ANALYSIS: isDev,
  };
};

/**
 * URL parameter-based feature flag overrides
 * Usage: ?flags=PLAYER_MODE_ENABLED:true,AUDIO_ENABLED:false
 */
const getUrlFlags = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const flagsParam = urlParams.get('flags');
  
  if (!flagsParam) return {};
  
  const flags: Partial<FeatureFlags> = {};
  
  flagsParam.split(',').forEach(flag => {
    const [key, value] = flag.split(':');
    if (key && value && key in DEFAULT_FLAGS) {
      flags[key as keyof FeatureFlags] = value.toLowerCase() === 'true';
    }
  });
  
  return flags;
};

/**
 * localStorage-based feature flag overrides for persistent dev settings
 */
const getStorageFlags = (): Partial<FeatureFlags> => {
  if (typeof localStorage === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem('orcs:feature-flags');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Default feature flag values
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // Development features
  DEV_OVERLAY: false,
  DEV_DEBUG_TOOLS: false,
  DEV_PERFORMANCE_MONITORING: false,
  
  // Game mode features - all enabled by default
  PLAYER_MODE_ENABLED: true,
  SPECTATE_MODE_ENABLED: true,
  FREE_ROAM_ENABLED: true,
  
  // Simulation features - all enabled
  ENHANCED_AI_LOGIC: true,
  ADVANCED_RELATIONSHIPS: true,
  WARCALL_SYSTEM: true,
  
  // Combat features - all enabled
  LOCK_ON_SYSTEM: true,
  SIGNATURE_MOVES: true,
  ADVANCED_PHYSICS: true,
  
  // Audio/Visual features - all enabled
  AUDIO_ENABLED: true,
  PORTRAIT_ATLASES: true,
  SPRITE_ANIMATIONS: true,
  
  // Performance features
  LAZY_LOADING: false,
  CODE_SPLITTING: false,
  BUNDLE_ANALYSIS: false,
};

/**
 * Computed feature flags with override priority:
 * 1. URL parameters (highest priority)
 * 2. localStorage overrides
 * 3. Environment-based flags
 * 4. Default values (lowest priority)
 */
export const FLAGS: FeatureFlags = {
  ...DEFAULT_FLAGS,
  ...getEnvironmentFlags(),
  ...getStorageFlags(),
  ...getUrlFlags(),
};

/**
 * Utility function to check if a feature is enabled
 */
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return FLAGS[flag];
};

/**
 * Utility function to set feature flags at runtime (dev only)
 */
export const setFeatureFlag = (flag: keyof FeatureFlags, enabled: boolean): void => {
  if (!FLAGS.DEV_DEBUG_TOOLS) {
    console.warn('Feature flag modification only available in development mode');
    return;
  }
  
  try {
    const stored = getStorageFlags();
    const updated = { ...stored, [flag]: enabled };
    localStorage.setItem('orcs:feature-flags', JSON.stringify(updated));
    console.log(`Feature flag ${flag} set to ${enabled}. Reload to apply.`);
  } catch (error) {
    console.error('Failed to set feature flag:', error);
  }
};

/**
 * Reset all feature flags to defaults
 */
export const resetFeatureFlags = (): void => {
  if (!FLAGS.DEV_DEBUG_TOOLS) {
    console.warn('Feature flag reset only available in development mode');
    return;
  }
  
  try {
    localStorage.removeItem('orcs:feature-flags');
    console.log('Feature flags reset. Reload to apply.');
  } catch (error) {
    console.error('Failed to reset feature flags:', error);
  }
};

/**
 * Export current flags for debugging
 */
export const debugFlags = (): void => {
  if (!FLAGS.DEV_DEBUG_TOOLS) return;
  
  console.table(FLAGS);
};

// Development helper: expose to window in dev mode
if (FLAGS.DEV_DEBUG_TOOLS && typeof window !== 'undefined') {
  (window as any).__orcsFlags = {
    flags: FLAGS,
    setFlag: setFeatureFlag,
    resetFlags: resetFeatureFlags,
    debugFlags,
  };
}