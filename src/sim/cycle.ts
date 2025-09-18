import {
  KING_UNSTABLE_DURATION,
  PROMOTION_THRESHOLDS,
  RANK_QUOTAS
} from './constants';
import {
  createDeathEntry,
  createGeneralEntry,
  createPromotionEntry,
  createSpawnEntry
} from './feed';
import { addMemory, createOfficer } from './officerFactory';
import {
  expireBloodOaths,
  collectBloodOathVictims,
  seedSpawnRelationships
} from './relationships';
import { RNG } from './rng';
import type {
  CycleSummary,
  FeedEntry,
  Officer,
  Rank,
  WarcallPlan,
  WorldState
} from './types';
import {
  enqueuePlannedWarcalls,
  planWarcall,
  resolveDueWarcalls
} from './warcall';

function countByRank(officers: Officer[]): Record<Rank, number> {
  const counts: Record<Rank, number> = {
    König: 0,
    Spieler: 0,
    Captain: 0,
    Späher: 0,
    Grunzer: 0
  };
  officers.forEach((officer) => {
    counts[officer.rank] += 1;
  });
  return counts;
}

function removeRelationshipsTo(
  officers: Officer[],
  fallen: Set<string>
): Officer[] {
  return officers.map((officer) => ({
    ...officer,
    relationships: officer.relationships.filter(
      (relation) => !fallen.has(relation.with)
    )
  }));
}

function processDeaths(
  state: WorldState,
  deaths: Set<string>,
  rng: RNG
): { feed: FeedEntry[]; deadIds: string[] } {
  const feed: FeedEntry[] = [];
  const deadIds: string[] = [];
  if (deaths.size === 0) return { feed, deadIds };
  state.officers = removeRelationshipsTo(state.officers, deaths);
  for (const id of deaths) {
    const officer = state.officers.find((candidate) => candidate.id === id);
    if (!officer) continue;
    const updated = addMemory(
      { ...officer, status: 'DEAD', cycleDied: state.cycle },
      {
        cycle: state.cycle,
        category: 'DEATH',
        summary: `Gefallen in Zyklus ${state.cycle}`
      }
    );
    feed.push(createDeathEntry(rng, state.cycle, updated, 'im Blutrausch'));
    deadIds.push(updated.id);
    state.graveyard = [{ ...updated }, ...state.graveyard];
    state.officers = state.officers.filter((candidate) => candidate.id !== id);
  }
  return { feed, deadIds };
}

function ensureKing(state: WorldState, rng: RNG, feed: FeedEntry[]): void {
  const currentKing = state.officers.find(
    (officer) => officer.id === state.kingId
  );
  if (currentKing) return;
  if (state.officers.length === 0) return;
  const candidates = [...state.officers].sort((a, b) => b.merit - a.merit);
  const newKing = { ...candidates[0], rank: 'König' as Rank };
  state.kingId = newKing.id;
  state.kingStatus = 'UNGEFESTIGT';
  state.kingStatusExpires = state.cycle + KING_UNSTABLE_DURATION;
  state.officers = state.officers.map((officer) =>
    officer.id === newKing.id ? newKing : officer
  );
  feed.push(
    createGeneralEntry(
      rng,
      state.cycle,
      `${newKing.name} besteigt als UNGEFESTIGT den Thron.`
    )
  );
  const memory = addMemory(newKing, {
    cycle: state.cycle,
    category: 'PROMOTION',
    summary: 'Zum König erhoben'
  });
  state.officers = state.officers.map((officer) =>
    officer.id === memory.id ? memory : officer
  );
}

function ensureQuota(
  state: WorldState,
  rng: RNG,
  cycle: number
): { spawns: Officer[]; feed: FeedEntry[] } {
  const feed: FeedEntry[] = [];
  const spawns: Officer[] = [];
  const counts = countByRank(state.officers);
  (Object.keys(RANK_QUOTAS) as Rank[]).forEach((rank) => {
    const quota = RANK_QUOTAS[rank];
    while (
      counts[rank] + spawns.filter((officer) => officer.rank === rank).length <
      quota
    ) {
      let recruit = createOfficer(rng, rank, cycle);
      recruit = addMemory(recruit, {
        cycle,
        category: 'SPAWN',
        summary: 'Neu in der Horde'
      });
      state.officers.push(recruit);
      spawns.push(recruit);
      feed.push(createSpawnEntry(rng, cycle, recruit));
      const relationFeed = seedSpawnRelationships(state, recruit, rng);
      feed.push(...relationFeed);
    }
  });
  return { spawns, feed };
}

function processPromotions(
  state: WorldState,
  rng: RNG
): {
  promotions: { officerId: string; from: Rank; to: Rank }[];
  feed: FeedEntry[];
} {
  const feed: FeedEntry[] = [];
  const promotions: { officerId: string; from: Rank; to: Rank }[] = [];
  const counts = countByRank(state.officers);
  const ordered = [...state.officers].sort((a, b) => b.merit - a.merit);
  for (const officer of ordered) {
    const thresholds = PROMOTION_THRESHOLDS[officer.rank];
    if (thresholds.promoteAt !== undefined && thresholds.promoteTo) {
      if (
        officer.merit >= thresholds.promoteAt &&
        counts[thresholds.promoteTo] < RANK_QUOTAS[thresholds.promoteTo]
      ) {
        counts[officer.rank] -= 1;
        counts[thresholds.promoteTo] += 1;
        const updated = addMemory(
          { ...officer, rank: thresholds.promoteTo },
          {
            cycle: state.cycle,
            category: 'PROMOTION',
            summary: `Aufstieg zu ${thresholds.promoteTo}`
          }
        );
        state.officers = state.officers.map((candidate) =>
          candidate.id === updated.id ? updated : candidate
        );
        promotions.push({
          officerId: officer.id,
          from: officer.rank,
          to: thresholds.promoteTo
        });
        feed.push(
          createPromotionEntry(rng, state.cycle, updated, thresholds.promoteTo)
        );
        continue;
      }
    }
    if (
      thresholds.demoteBelow !== undefined &&
      thresholds.demoteTo &&
      officer.merit < thresholds.demoteBelow
    ) {
      counts[officer.rank] -= 1;
      counts[thresholds.demoteTo] += 1;
      const updated = addMemory(
        { ...officer, rank: thresholds.demoteTo },
        {
          cycle: state.cycle,
          category: 'PROMOTION',
          summary: `Abstieg zu ${thresholds.demoteTo}`
        }
      );
      state.officers = state.officers.map((candidate) =>
        candidate.id === updated.id ? updated : candidate
      );
      promotions.push({
        officerId: officer.id,
        from: officer.rank,
        to: thresholds.demoteTo
      });
      feed.push(
        createGeneralEntry(
          rng,
          state.cycle,
          `${updated.name} wird zum ${thresholds.demoteTo} zurückgestuft.`
        )
      );
    }
  }
  return { promotions, feed };
}

function updateKingStability(
  state: WorldState,
  rng: RNG,
  feed: FeedEntry[]
): void {
  if (
    state.kingStatus === 'UNGEFESTIGT' &&
    state.cycle >= state.kingStatusExpires
  ) {
    state.kingStatus = 'GEFESTIGT';
    feed.push(
      createGeneralEntry(
        rng,
        state.cycle,
        'Der König gilt wieder als GEFESTIGT.'
      )
    );
  }
}

function planNextWarcalls(state: WorldState, rng: RNG): WarcallPlan[] {
  const planned: WarcallPlan[] = [];
  const attempts = 1 + (state.cycle % 2);
  for (let i = 0; i < attempts; i += 1) {
    const plan = planWarcall(state, rng, state.cycle);
    if (plan) planned.push(plan);
  }
  enqueuePlannedWarcalls(state, planned);
  return planned;
}

function orderFeed(entries: FeedEntry[]): FeedEntry[] {
  return [...entries].sort((a, b) => {
    if (a.priority === b.priority) {
      return a.id.localeCompare(b.id);
    }
    return b.priority - a.priority;
  });
}

export function advanceCycle(state: WorldState, rng: RNG): CycleSummary {
  state.cycle += 1;
  const cycleFeed: FeedEntry[] = [];
  updateKingStability(state, rng, cycleFeed);

  const expiryFeed = expireBloodOaths(state, state.cycle, rng);
  cycleFeed.push(...expiryFeed);

  const resolutions = resolveDueWarcalls(state, rng);
  resolutions.forEach((resolution) => {
    cycleFeed.push(...resolution.feed);
  });

  const casualties = new Set<string>();
  resolutions.forEach((resolution) =>
    resolution.casualties.forEach((id) => casualties.add(id))
  );
  const extra = collectBloodOathVictims(state, casualties, state.cycle);
  extra.forEach((id) => casualties.add(id));

  const deathResult = processDeaths(state, casualties, rng);
  cycleFeed.push(...deathResult.feed);

  ensureKing(state, rng, cycleFeed);

  const { spawns, feed: spawnFeed } = ensureQuota(state, rng, state.cycle);
  cycleFeed.push(...spawnFeed);

  const planned = planNextWarcalls(state, rng);

  const promotionResult = processPromotions(state, rng);
  cycleFeed.push(...promotionResult.feed);

  const orderedFeed = orderFeed(cycleFeed);
  state.feed = [...state.feed, ...orderedFeed].slice(-120);

  return {
    cycle: state.cycle,
    warcallsResolved: resolutions,
    warcallsPlanned: planned,
    deaths: deathResult.deadIds,
    spawns,
    promotions: promotionResult.promotions,
    feed: orderedFeed
  };
}
