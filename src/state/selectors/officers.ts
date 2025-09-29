import { RNG } from '@sim/rng';
import type { Officer, Rank, WorldState } from '@sim/types';
import type {
  RelationEdge,
  OverlayRelationType
} from '@ui/overlay/RelationsOverlay';
import type { UIFilters } from '@state/ui/filters';

const ALL_RELATION_TYPES: OverlayRelationType[] = [
  'ally',
  'rival'
  // Removed hierarchy - no more gray connection lines
];

function officerHasRelation(
  officer: Officer,
  type: Officer['relationships'][number]['type']
): boolean {
  return officer.relationships.some((relation) => relation.type === type);
}

function officerHasRelationWith(
  officer: Officer,
  type: Officer['relationships'][number]['type'],
  targetId: string
): boolean {
  return officer.relationships.some(
    (relation) => relation.type === type && relation.with === targetId
  );
}

function computePromotionCandidates(officers: Officer[]): Set<string> {
  const byRank = new Map<Rank, Officer[]>();
  officers.forEach((officer) => {
    const list = byRank.get(officer.rank) ?? [];
    list.push(officer);
    byRank.set(officer.rank, list);
  });
  const candidates = new Set<string>();
  byRank.forEach((list) => {
    if (list.length === 0) return;
    const sorted = [...list].sort((a, b) => b.merit - a.merit);
    const count = Math.max(1, Math.floor(sorted.length * 0.25));
    sorted.slice(0, count).forEach((officer) => candidates.add(officer.id));
  });
  return candidates;
}

function computeCoupRisk(officers: Officer[], kingId: string): Set<string> {
  if (officers.length === 0) return new Set<string>();
  const merits = [...officers]
    .map((officer) => officer.merit)
    .sort((a, b) => a - b);
  const index = Math.max(0, Math.floor(merits.length * 0.7));
  const threshold = merits[index] ?? merits[merits.length - 1] ?? 0;
  const risky = officers.filter(
    (officer) =>
      officerHasRelationWith(officer, 'RIVAL', kingId) &&
      (officer.mood.loyalitaet ?? 50) < 35 &&
      officer.merit >= threshold
  );
  return new Set(risky.map((officer) => officer.id));
}

function applyOfficerFilters(
  state: WorldState,
  filters: UIFilters,
  officers: Officer[]
): Officer[] {
  // No filters applied anymore - return all officers
  return officers;
}

function sortOfficers(
  state: WorldState,
  officers: Officer[],
  sortBy: UIFilters['sortBy']
): Officer[] {
  if (sortBy === 'random') {
    const rng = new RNG(`${state.seed}:filters:${state.cycle}`);
    return rng.shuffle(officers);
  }
  return [...officers].sort((a, b) => {
    switch (sortBy) {
      case 'level':
        return b.stats.level - a.stats.level;
      case 'merit':
      default:
        return b.merit - a.merit;
    }
  });
}

export function selectVisibleOfficers(
  state: WorldState,
  filters: UIFilters
): Officer[] {
  const { officers, kingId } = state;
  const applied = applyOfficerFilters(state, filters, officers);
  const sorted = sortOfficers(state, applied, filters.sortBy);
  const king = officers.find((officer) => officer.id === kingId);
  if (king && !sorted.some((officer) => officer.id === king.id)) {
    return [king, ...sorted];
  }
  return sorted;
}

export function lensMaskForFilters(
  filters: UIFilters
): Set<OverlayRelationType> {
  // No filters anymore, so show all relation types
  const mask = new Set<OverlayRelationType>();
  ALL_RELATION_TYPES.forEach((type) => mask.add(type));
  return mask;
}

export function selectVisibleEdges(
  visibleOfficers: Officer[],
  edges: RelationEdge[],
  filters: UIFilters
): RelationEdge[] {
  const visibleIds = new Set(visibleOfficers.map((officer) => officer.id));
  const mask = lensMaskForFilters(filters);
  return edges.filter(
    (edge) =>
      mask.has(edge.type) &&
      visibleIds.has(edge.fromId) &&
      visibleIds.has(edge.toId)
  );
}
