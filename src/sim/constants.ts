import type { FeedEntry, Rank, Trait } from '@sim/types';

export const TOTAL_ACTIVE_OFFICERS = 20;

export const RANK_QUOTAS: Record<Rank, number> = {
  König: 1,
  Spieler: 1,
  Captain: 4,
  Späher: 4,
  Grunzer: 10
};

export const PROMOTION_THRESHOLDS: Record<
  Rank,
  {
    promoteAt?: number;
    promoteTo?: Rank;
    demoteBelow?: number;
    demoteTo?: Rank;
  }
> = {
  König: {},
  Spieler: { demoteBelow: 120, demoteTo: 'Captain' },
  Captain: {
    promoteAt: 150,
    promoteTo: 'Spieler',
    demoteBelow: 40,
    demoteTo: 'Späher'
  },
  Späher: {
    promoteAt: 90,
    promoteTo: 'Captain',
    demoteBelow: 20,
    demoteTo: 'Grunzer'
  },
  Grunzer: { promoteAt: 50, promoteTo: 'Späher' }
};

export const TRAIT_COMBAT_WEIGHTS: Record<Trait, number> = {
  Feigling: -0.4,
  Berserker: 0.45,
  Hinterhältig: 0.3,
  Trinkfest: 0.15,
  Tierjäger: 0.2,
  Intrigant: 0.25
};

export const RELATIONSHIP_BONUS = {
  ALLY: 0.35,
  FRIEND: 0.2,
  RIVAL: -0.45,
  BLOOD_OATH: 0.5
} as const;

export const BLOOD_OATH_DURATION = 10;
export const KING_UNSTABLE_DURATION = 5;

export const FEED_PRIORITIES: Record<FeedEntry['tone'], number> = {
  DEATH: 100,
  SPAWN: 80,
  PROMOTION: 70,
  WARCALL: 60,
  RELATIONSHIP: 50,
  GENERAL: 10
};
