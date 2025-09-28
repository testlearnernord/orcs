import type {
  CycleSummary,
  WorldState,
  Officer,
  Relationship
} from '@sim/types';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions
} from '../types';
import { HighlightType } from '../types';

/**
 * Diplomacy Highlight Module - Priority 3
 * Generates cinematic highlights for relationship changes with confrontation presentation
 */
export class DiplomacyModule implements HighlightModule {
  readonly type = HighlightType.DIPLOMACY;
  readonly priority = 3;

  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[] {
    const highlights: EnhancedHighlight[] = [];
    const cycle = summary?.cycle ?? next.cycle;

    const officerLookup = new Map<string, Officer>();
    [...prev.officers, ...next.officers].forEach((officer) => {
      officerLookup.set(officer.id, officer);
    });

    // Track rivalry changes
    const prevRivals = this.collectRelationshipPairs(prev.officers, 'RIVAL');
    const nextRivals = this.collectRelationshipPairs(next.officers, 'RIVAL');

    // New rivalries
    nextRivals.forEach((info, key) => {
      if (prevRivals.has(key)) return;
      const [a, b] = info.ids;
      const officerA = officerLookup.get(a);
      const officerB = officerLookup.get(b);

      highlights.push({
        id: `rivalry:new:${key}`,
        type: this.type,
        priority: this.priority,
        cycle,
        icon: '⚔️',
        title: `Neue Rivalität entflammt`,
        description: `${officerA?.name || a} und ${officerB?.name || b} werden zu erbitterten Rivalen`,
        score: this.priority + Math.random() * 0.1,
        text: `${officerA?.name || a} und ${officerB?.name || b} werden zu erbitterten Rivalen`,
        primaryOfficer: officerA,
        secondaryOfficer: officerB,
        relationshipChange: {
          before: 'neutral',
          after: 'rival'
        },
        animationType: 'confrontation',
        duration: 2500
      });
    });

    // Ended rivalries
    prevRivals.forEach((info, key) => {
      if (nextRivals.has(key)) return;
      const [a, b] = info.ids;
      const officerA = officerLookup.get(a);
      const officerB = officerLookup.get(b);

      highlights.push({
        id: `rivalry:end:${key}`,
        type: this.type,
        priority: this.priority,
        cycle,
        icon: '🤝',
        title: `Rivalität beigelegt`,
        description: `${officerA?.name || a} und ${officerB?.name || b} beenden ihren Konflikt`,
        score: this.priority + Math.random() * 0.1,
        text: `${officerA?.name || a} und ${officerB?.name || b} beenden ihren Konflikt`,
        primaryOfficer: officerA,
        secondaryOfficer: officerB,
        relationshipChange: {
          before: 'rival',
          after: 'neutral'
        },
        animationType: 'celebration',
        duration: 2000
      });
    });

    return highlights;
  }

  private collectRelationshipPairs(
    officers: Officer[],
    type: Relationship['type']
  ): Map<string, { ids: [string, string]; relation: Relationship }> {
    const map = new Map<
      string,
      { ids: [string, string]; relation: Relationship }
    >();

    officers.forEach((officer) => {
      officer.relationships.forEach((relation) => {
        if (relation.type !== type) return;
        const [a, b] = [officer.id, relation.with].sort();
        const key = `${a}:${b}:${type}`;
        if (map.has(key)) return;
        map.set(key, { ids: [a, b], relation });
      });
    });

    return map;
  }

  shouldShow(
    highlight: EnhancedHighlight,
    options: HighlightDisplayOptions
  ): boolean {
    return options.enabled && !options.skipAll;
  }
}
