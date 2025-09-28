import type { CycleSummary, WorldState, Officer } from '@sim/types';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions
} from '../types';
import { HighlightType } from '../types';

/**
 * Warcall Resolution Highlight Module - Priority 2
 * Generates cinematic highlights for resolved warcalls with confrontation presentation
 */
export class WarcallResolutionModule implements HighlightModule {
  readonly type = HighlightType.WARCALL_RESOLUTION;
  readonly priority = 2;

  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[] {
    if (!summary?.warcallsResolved?.length) return [];

    const officerLookup = new Map<string, Officer>();
    [...prev.officers, ...next.officers].forEach((officer) => {
      officerLookup.set(officer.id, officer);
    });

    return summary.warcallsResolved.flatMap((resolution) => {
      const participants = resolution.warcall.participants
        .map((id) => officerLookup.get(id))
        .filter((officer): officer is Officer => Boolean(officer));

      const initiator = officerLookup.get(resolution.warcall.initiator);
      const hasPlayer = participants.some(
        (officer) => officer.rank === 'Spieler'
      );

      // Only show high-priority warcalls (with player involvement or large groups)
      if (!hasPlayer && participants.length < 4) return [];

      const baseId = `warcall:${resolution.warcall.id}:${summary.cycle}`;
      const title = resolution.success
        ? `Warcall bei ${resolution.warcall.location} erfolgreich`
        : `Warcall bei ${resolution.warcall.location} gescheitert`;

      const description = hasPlayer
        ? `${initiator?.name || 'Initiator'} ${resolution.success ? 'triumphiert' : 'scheitert'} bei ${resolution.warcall.location}`
        : `Große Schar versammelt sich bei ${resolution.warcall.location} (${participants.length} Teilnehmer)`;

      const icon = resolution.success ? '🏆' : hasPlayer ? '⚠️' : '⚔️';

      return [
        {
          id: hasPlayer ? `${baseId}:player` : `${baseId}:mass`,
          type: this.type,
          priority: this.priority,
          cycle: summary.cycle,
          icon,
          title,
          description,
          score: this.priority + Math.random() * 0.1,
          text: description,
          primaryOfficer: initiator,
          secondaryOfficer: participants.find((p) => p.id !== initiator?.id),
          animationType: resolution.success ? 'celebration' : 'confrontation',
          duration: 2500
        }
      ];
    });
  }

  shouldShow(
    highlight: EnhancedHighlight,
    options: HighlightDisplayOptions
  ): boolean {
    return options.enabled && !options.skipAll;
  }
}
