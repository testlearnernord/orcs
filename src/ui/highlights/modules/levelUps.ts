import type { CycleSummary, WorldState, Officer } from '@sim/types';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions
} from '../types';
import { HighlightType } from '../types';

/**
 * Level-Up and Experience Highlight Module - Priority 3.5
 * Generates highlights for officer level changes and significant stat increases
 * Addresses missing EXP bar and level-up notifications mentioned in issue
 */
export class LevelUpModule implements HighlightModule {
  readonly type = HighlightType.LEVEL_UP;
  readonly priority = 3.5;

  generate(
    prev: WorldState,
    next: WorldState,
    _summary?: CycleSummary
  ): EnhancedHighlight[] {
    const highlights: EnhancedHighlight[] = [];

    // Create maps for quick lookup
    const prevOfficers = new Map<string, Officer>();
    prev.officers.forEach((officer) => {
      prevOfficers.set(officer.id, officer);
    });

    // Check each officer for level changes or significant stat improvements
    next.officers.forEach((currentOfficer) => {
      const previousOfficer = prevOfficers.get(currentOfficer.id);
      if (!previousOfficer) {
        // New officer, skip level-up check
        return;
      }

      // Check for level increase
      const levelDiff =
        currentOfficer.stats.level - previousOfficer.stats.level;
      if (levelDiff > 0) {
        highlights.push(
          this.createLevelUpHighlight(currentOfficer, levelDiff, next.cycle)
        );
      }

      // Check for significant stat increases (indicating experience gain)
      const statChanges = this.calculateStatChanges(
        previousOfficer,
        currentOfficer
      );
      if (statChanges.hasSignificantGain) {
        highlights.push(
          this.createStatGainHighlight(currentOfficer, statChanges, next.cycle)
        );
      }
    });

    return highlights;
  }

  private createLevelUpHighlight(
    officer: Officer,
    levelIncrease: number,
    cycle: number
  ): EnhancedHighlight {
    const archetype = this.deriveArchetype(officer);
    const title = `${officer.name} steigt auf!`;
    const description =
      levelIncrease === 1
        ? `Level ${officer.stats.level} erreicht! Der ${archetype} wird stärker.`
        : `${levelIncrease} Level gewonnen! Jetzt Level ${officer.stats.level}.`;

    return {
      id: `levelup:${officer.id}:${cycle}`,
      type: this.type,
      priority: this.priority,
      cycle,
      icon: '⬆️',
      title,
      description,
      score: this.priority + levelIncrease * 0.1,
      text: description,
      primaryOfficer: officer,
      levelChange: {
        officerId: officer.id,
        previousLevel: officer.stats.level - levelIncrease,
        newLevel: officer.stats.level,
        increase: levelIncrease
      },
      animationType: 'celebration',
      duration: 2000
    };
  }

  private createStatGainHighlight(
    officer: Officer,
    statChanges: StatChanges,
    cycle: number
  ): EnhancedHighlight {
    const archetype = this.deriveArchetype(officer);
    const primaryStat = statChanges.primaryStatName;
    const title = `${officer.name} wird ${primaryStat === 'str' ? 'stärker' : primaryStat === 'dex' ? 'geschickter' : 'intelligenter'}`;
    const description = `${archetype} gewinnt Erfahrung: ${primaryStat.toUpperCase()} +${statChanges.primaryStatIncrease}`;

    return {
      id: `statgain:${officer.id}:${cycle}`,
      type: this.type,
      priority: this.priority + 0.1, // Slightly lower priority than level-ups
      cycle,
      icon: '💪',
      title,
      description,
      score: this.priority + statChanges.totalIncrease * 0.05,
      text: description,
      primaryOfficer: officer,
      statGain: {
        officerId: officer.id,
        statChanges: {
          str: statChanges.str,
          dex: statChanges.dex,
          int: statChanges.int
        },
        totalIncrease: statChanges.totalIncrease
      },
      animationType: 'emergence',
      duration: 1500
    };
  }

  private calculateStatChanges(
    previous: Officer,
    current: Officer
  ): StatChanges {
    const strChange = current.stats.str - previous.stats.str;
    const dexChange = current.stats.dex - previous.stats.dex;
    const intChange = current.stats.int - previous.stats.int;

    const totalIncrease = strChange + dexChange + intChange;

    // Determine primary stat (the one with biggest increase)
    let primaryStatName: 'str' | 'dex' | 'int' = 'str';
    let primaryStatIncrease = strChange;

    if (dexChange > primaryStatIncrease) {
      primaryStatName = 'dex';
      primaryStatIncrease = dexChange;
    }
    if (intChange > primaryStatIncrease) {
      primaryStatName = 'int';
      primaryStatIncrease = intChange;
    }

    return {
      str: strChange,
      dex: dexChange,
      int: intChange,
      totalIncrease,
      primaryStatName,
      primaryStatIncrease,
      hasSignificantGain: totalIncrease >= 3 // Only highlight if total stat gain is 3+
    };
  }

  private deriveArchetype(officer: Officer): string {
    if (officer.traits.includes('Archer')) {
      return 'Archer';
    }
    if (officer.traits.includes('Trapper')) {
      return 'Trapper';
    }
    return 'Berserker';
  }

  shouldShow(
    highlight: EnhancedHighlight,
    options: HighlightDisplayOptions
  ): boolean {
    return options.enabled && !options.skipAll;
  }
}

interface StatChanges {
  str: number;
  dex: number;
  int: number;
  totalIncrease: number;
  primaryStatName: 'str' | 'dex' | 'int';
  primaryStatIncrease: number;
  hasSignificantGain: boolean;
}
