import type { CycleSummary, WorldState } from '@sim/types';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions
} from '../types';
import { HighlightType } from '../types';

/**
 * New Grunts Highlight Module - Priority 5
 * Generates cinematic highlights for newly spawned officers with emergence presentation
 */
export class NewGruntsModule implements HighlightModule {
  readonly type = HighlightType.NEW_GRUNT;
  readonly priority = 5;

  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[] {
    if (!summary?.spawns?.length) return [];

    return summary.spawns.map((officer) => {
      const traits =
        officer.traits.join(', ') || 'keine besonderen Eigenschaften';

      const title = `${officer.name} tritt der Horde bei`;
      const description = `Ein neuer ${officer.rank} verstärkt unsere Reihen. Eigenschaften: ${traits}`;

      return {
        id: `spawn:${officer.id}:${summary.cycle}`,
        type: this.type,
        priority: this.priority,
        cycle: summary.cycle,
        icon: '✨',
        title,
        description,
        score: this.priority + Math.random() * 0.1,
        text: description,
        primaryOfficer: officer,
        animationType: 'emergence',
        duration: 1500
      };
    });
  }

  shouldShow(
    highlight: EnhancedHighlight,
    options: HighlightDisplayOptions
  ): boolean {
    return options.enabled && !options.skipAll;
  }
}
