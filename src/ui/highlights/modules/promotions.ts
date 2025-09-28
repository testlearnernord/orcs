import type { CycleSummary, WorldState, Officer, Rank } from '@sim/types';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions
} from '../types';
import { HighlightType } from '../types';

/**
 * Promotions Highlight Module - Priority 4
 * Generates cinematic highlights for rank changes with celebration/tragedy presentation
 */
export class PromotionsModule implements HighlightModule {
  readonly type = HighlightType.PROMOTION;
  readonly priority = 4;

  private readonly RANK_ORDER: Rank[] = [
    'Grunzer',
    'Späher',
    'Captain',
    'Spieler',
    'König'
  ];
  private readonly RANK_SCORE = new Map<Rank, number>(
    this.RANK_ORDER.map((rank, index) => [rank, index])
  );

  generate(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): EnhancedHighlight[] {
    if (!summary?.promotions?.length) return [];

    const officerLookup = new Map<string, Officer>();
    [...prev.officers, ...next.officers].forEach((officer) => {
      officerLookup.set(officer.id, officer);
    });

    return summary.promotions.map((promotion) => {
      const officer = officerLookup.get(promotion.officerId);
      const fromScore = this.RANK_SCORE.get(promotion.from) ?? 0;
      const toScore = this.RANK_SCORE.get(promotion.to) ?? 0;
      const isPromotion = toScore > fromScore;

      const title = isPromotion
        ? `${officer?.name || promotion.officerId} wird befördert`
        : `${officer?.name || promotion.officerId} wird degradiert`;

      const description = isPromotion
        ? `Aufstieg von ${promotion.from} zu ${promotion.to} für verdiente Leistungen`
        : `Abstieg von ${promotion.from} zu ${promotion.to} aufgrund mangelnder Leistung`;

      return {
        id: `promotion:${promotion.officerId}:${promotion.to}:${summary.cycle}`,
        type: this.type,
        priority: this.priority,
        cycle: summary.cycle,
        icon: isPromotion ? '⬆️' : '⬇️',
        title,
        description,
        score: this.priority + Math.random() * 0.1,
        text: description,
        primaryOfficer: officer,
        hierarchyChange: {
          officerId: promotion.officerId,
          fromRank: promotion.from,
          toRank: promotion.to,
          direction: isPromotion ? 'promotion' : 'demotion'
        },
        animationType: isPromotion ? 'celebration' : 'tragedy',
        duration: 2000
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
