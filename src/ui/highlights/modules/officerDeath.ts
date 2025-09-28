import type { CycleSummary, WorldState } from '@sim/types';
import type { EnhancedHighlight, HighlightModule, HighlightDisplayOptions } from '../types';
import { HighlightType } from '../types';

/**
 * Officer Death Highlight Module - Priority 1
 * Generates cinematic highlights for fallen officers with tragedy presentation
 */
export class OfficerDeathModule implements HighlightModule {
  readonly type = HighlightType.OFFICER_DEATH;
  readonly priority = 1;

  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[] {
    if (!summary?.deaths?.length) return [];

    const officerLookup = new Map();
    [...prev.officers, ...prev.graveyard].forEach(officer => {
      officerLookup.set(officer.id, officer);
    });

    return summary.deaths.map((officerId) => {
      const officer = officerLookup.get(officerId);
      const title = officer
        ? `${officer.name} fällt im Kampf`
        : `Offizier ${officerId} fällt im Kampf`;
      
      const description = officer
        ? `Der ${officer.rank} ${officer.name} ist gefallen. Seine Verdienste werden in Ehren gehalten.`
        : `Ein Offizier ist auf dem Schlachtfeld gefallen.`;

      return {
        id: `death:${officerId}:${summary.cycle}`,
        type: this.type,
        priority: this.priority,
        cycle: summary.cycle,
        icon: '⚰️',
        title,
        description,
        score: this.priority + Math.random() * 0.1, // Add jitter for sorting
        text: description, // Legacy compatibility
        primaryOfficer: officer,
        animationType: 'tragedy' as const,
        duration: 3000 // 3 seconds for dramatic effect
      };
    });
  }

  shouldShow(highlight: EnhancedHighlight, options: HighlightDisplayOptions): boolean {
    return options.enabled && !options.skipAll;
  }
}
