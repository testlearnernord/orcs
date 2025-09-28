import type { Officer, CycleSummary, WorldState } from '@sim/types';

/**
 * Core highlight data structure with enhanced data for cinematic presentation
 */
export interface EnhancedHighlight {
  id: string;
  type: HighlightType;
  priority: number; // Lower number = higher priority
  cycle: number;

  // Basic display
  icon: string;
  title: string;
  description?: string;

  // Legacy compatibility
  score: number; // For backward compatibility with renderDigestHistory
  text?: string; // For backward compatibility

  // Cinematic data for officer confrontations and visualizations
  primaryOfficer?: Officer;
  secondaryOfficer?: Officer;
  relationshipChange?: {
    before: 'neutral' | 'rival' | 'ally';
    after: 'neutral' | 'rival' | 'ally';
  };
  hierarchyChange?: {
    officerId: string;
    fromRank: string;
    toRank: string;
    direction: 'promotion' | 'demotion';
  };

  // Animation hints
  animationType?: 'confrontation' | 'celebration' | 'tragedy' | 'emergence';
  duration?: number; // ms for animations
}

/**
 * Highlight types with their priorities (lower = higher priority)
 */
export enum HighlightType {
  OFFICER_DEATH = 1, // Priority 1: Getötete Offiziere
  WARCALL_RESOLUTION = 2, // Priority 2: Warcall-Auflösungen
  DIPLOMACY = 3, // Priority 3: Diplomatie
  PROMOTION = 4, // Priority 4: Beförderungen
  NEW_GRUNT = 5 // Priority 5: Neue Grunzer
}

/**
 * Configuration for highlight display options
 */
export interface HighlightDisplayOptions {
  enabled: boolean;
  skipAll: boolean;
  showAnimations: boolean;
}

/**
 * Interface for modular highlight generators
 */
export interface HighlightModule {
  readonly type: HighlightType;
  readonly priority: number;

  /**
   * Generate highlights for this module type
   */
  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[];

  /**
   * Optional: Validate if this highlight should be shown based on current state
   */
  shouldShow?(
    highlight: EnhancedHighlight,
    options: HighlightDisplayOptions
  ): boolean;
}

/**
 * Events emitted by the highlight system
 */
export interface HighlightSystemEvents extends Record<string, any> {
  'highlights:queued': { cycle: number; highlights: EnhancedHighlight[] };
  'highlight:shown': EnhancedHighlight;
  'highlight:skipped': EnhancedHighlight;
  'highlights:cleared': { cycle: number };
  'options:changed': HighlightDisplayOptions;
}
