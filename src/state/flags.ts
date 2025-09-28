export const FLAGS = {
  PLAYER_MODE: true // Enabled for GitHub Pages deployment
} as const;

export type FeatureFlags = typeof FLAGS;
