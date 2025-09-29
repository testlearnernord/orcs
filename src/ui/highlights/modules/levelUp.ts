import type { CycleSummary, WorldState, Officer, PotentialRating } from '@sim/types';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions
} from '../types';
import { HighlightType } from '../types';

/**
 * Level Up Highlight Module - Priority 3.5
 * Generates cinematic highlights for level ups with stat gain information based on potential
 */
export class LevelUpModule implements HighlightModule {
  readonly type = HighlightType.DIPLOMACY; // Reusing existing type temporarily
  readonly priority = 3.5;

  // Stat gains based on potential when leveling up
  private readonly POTENTIAL_STAT_GAINS: Record<PotentialRating, { min: number; max: number }> = {
    Unbrauchbar: { min: 1, max: 2 },     // 1-2 stats per level
    Dumm: { min: 1, max: 3 },            // 1-3 stats per level
    Normal: { min: 2, max: 4 },          // 2-4 stats per level
    Fähig: { min: 3, max: 5 },           // 3-5 stats per level
    Überdurchschnittlich: { min: 4, max: 6 }, // 4-6 stats per level
    Genie: { min: 5, max: 8 }            // 5-8 stats per level
  };

  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[] {
    if (!summary) return [];

    const highlights: EnhancedHighlight[] = [];
    const prevOfficerMap = new Map(prev.officers.map(o => [o.id, o]));

    // Check for level ups by comparing previous and current levels
    next.officers.forEach(officer => {
      const prevOfficer = prevOfficerMap.get(officer.id);
      if (!prevOfficer) return; // New officer, skip

      const levelGain = officer.stats.level - prevOfficer.stats.level;
      if (levelGain <= 0) return; // No level up

      // Calculate stat gains based on potential
      const potential = officer.stats.potential;
      const statGainRange = this.POTENTIAL_STAT_GAINS[potential];
      
      // Calculate what stats likely increased (compare current vs previous)
      const strGain = Math.max(0, officer.stats.str - prevOfficer.stats.str);
      const dexGain = Math.max(0, officer.stats.dex - prevOfficer.stats.dex);
      const intGain = Math.max(0, officer.stats.int - prevOfficer.stats.int);
      
      const totalStatGain = strGain + dexGain + intGain;
      
      // Create detailed stat gain text
      const statGains: string[] = [];
      if (strGain > 0) statGains.push(`+${strGain} Stärke`);
      if (dexGain > 0) statGains.push(`+${dexGain} Geschick`);
      if (intGain > 0) statGains.push(`+${intGain} Intelligenz`);
      
      const statGainText = statGains.length > 0 ? statGains.join(', ') : 'Keine Änderungen';
      
      const title = levelGain === 1 
        ? `${officer.name} erreicht Level ${officer.stats.level}!`
        : `${officer.name} steigt ${levelGain} Level auf!`;

      const description = `Level ${prevOfficer.stats.level} → ${officer.stats.level} (${potential})\n${statGainText}`;

      // Icon based on potential quality
      const icons: Record<PotentialRating, string> = {
        Unbrauchbar: '📈',
        Dumm: '⬆️',
        Normal: '🌟',
        Fähig: '⭐',
        Überdurchschnittlich: '💫',
        Genie: '✨'
      };

      highlights.push({
        id: `levelup:${officer.id}:${officer.stats.level}:${summary.cycle}`,
        type: this.type,
        priority: this.priority,
        cycle: summary.cycle,
        icon: icons[potential],
        title,
        description,
        score: this.priority + Math.random() * 0.1,
        text: `${officer.name} steigt auf Level ${officer.stats.level} auf! ${statGainText}`,
        primaryOfficer: officer,
        animationType: 'celebration',
        duration: 2500
      });
    });

    return highlights;
  }

  shouldShow(
    highlight: EnhancedHighlight,
    options: HighlightDisplayOptions
  ): boolean {
    return options.enabled && !options.skipAll;
  }
}