import type {
  CycleSummary,
  Officer,
  Rank,
  Relationship,
  WorldState
} from '@sim/types';

export type Highlight = {
  id: string;
  label: string;
  icon: string;
  score: number;
  details?: string;
};

const RANK_ORDER: Rank[] = ['Grunzer', 'Späher', 'Captain', 'Spieler', 'König'];
const RANK_SCORE = new Map<Rank, number>(
  RANK_ORDER.map((rank, index) => [rank, index])
);

function jitter(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  const offset = (hash % 200) - 100;
  return offset / 1000;
}

function score(base: number, seed: string): number {
  return base + jitter(seed);
}

function buildLookup(prev: WorldState, next: WorldState): Map<string, Officer> {
  const map = new Map<string, Officer>();
  const insert = (officer: Officer) => {
    if (!map.has(officer.id)) {
      map.set(officer.id, officer);
    }
  };
  [
    ...prev.officers,
    ...prev.graveyard,
    ...next.officers,
    ...next.graveyard
  ].forEach(insert);
  return map;
}

function nameOf(lookup: Map<string, Officer>, id: string): string {
  return lookup.get(id)?.name ?? id;
}

function collectRelationshipPairs(
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

function promotionHighlights(
  summary: CycleSummary | undefined,
  lookup: Map<string, Officer>
): Highlight[] {
  if (!summary) return [];
  return summary.promotions.map((promotion) => {
    const officer = lookup.get(promotion.officerId);
    const steps =
      (RANK_SCORE.get(promotion.to) ?? 0) -
      (RANK_SCORE.get(promotion.from) ?? 0);
    const direction = steps >= 0 ? 'up' : 'down';
    const magnitude = Math.abs(steps);
    const base = magnitude * 5;
    const label = officer
      ? direction === 'up'
        ? `${officer.name} steigt zum ${promotion.to} auf`
        : `${officer.name} fällt zum ${promotion.to}`
      : `${promotion.officerId} wechselt Rang`;
    const details = `${promotion.from} → ${promotion.to}`;
    const icon = direction === 'up' ? '⬆️' : '⬇️';
    return {
      id: `rank:${promotion.officerId}:${promotion.to}`,
      label,
      icon,
      details,
      score: score(base, `rank:${promotion.officerId}:${promotion.to}`)
    };
  });
}

function deathHighlights(
  summary: CycleSummary | undefined,
  lookup: Map<string, Officer>
): Highlight[] {
  if (!summary) return [];
  return summary.deaths.map((id) => {
    const officer = lookup.get(id);
    const label = officer
      ? `${officer.name} fällt im Zyklus ${summary.cycle}`
      : `${id} fällt im Zyklus ${summary.cycle}`;
    const details = officer ? `Letzter Rang: ${officer.rank}` : undefined;
    return {
      id: `death:${id}:${summary.cycle}`,
      label,
      icon: '☠️',
      details,
      score: score(4, `death:${id}:${summary.cycle}`)
    };
  });
}

function spawnHighlights(summary: CycleSummary | undefined): Highlight[] {
  if (!summary) return [];
  return summary.spawns.map((officer) => ({
    id: `spawn:${officer.id}:${summary.cycle}`,
    label: `${officer.name} verstärkt die Horde als ${officer.rank}`,
    icon: '✨',
    details: `Trait: ${officer.traits.join(', ') || 'keine'}`,
    score: score(4, `spawn:${officer.id}:${summary.cycle}`)
  }));
}

function relationshipHighlights(
  prev: WorldState,
  next: WorldState,
  lookup: Map<string, Officer>
): Highlight[] {
  const highlights: Highlight[] = [];
  const prevBlood = collectRelationshipPairs(prev.officers, 'BLOOD_OATH');
  const nextBlood = collectRelationshipPairs(next.officers, 'BLOOD_OATH');

  nextBlood.forEach((info, key) => {
    if (prevBlood.has(key)) return;
    const [a, b] = info.ids;
    highlights.push({
      id: `blood:new:${key}`,
      label: `Blutschwur zwischen ${nameOf(lookup, a)} und ${nameOf(lookup, b)}`,
      icon: '🩸',
      details:
        info.relation.sinceCycle !== undefined
          ? `Seit Zyklus ${info.relation.sinceCycle}`
          : undefined,
      score: score(3, `blood:new:${key}`)
    });
  });

  prevBlood.forEach((info, key) => {
    if (nextBlood.has(key)) return;
    const [a, b] = info.ids;
    highlights.push({
      id: `blood:end:${key}`,
      label: `Blutschwur erloschen: ${nameOf(lookup, a)} & ${nameOf(lookup, b)}`,
      icon: '💔',
      details:
        info.relation.expiresAtCycle !== undefined
          ? `Abgelaufen in Zyklus ${info.relation.expiresAtCycle}`
          : 'Bindung zerschnitten',
      score: score(3, `blood:end:${key}`)
    });
  });

  const prevRival = collectRelationshipPairs(prev.officers, 'RIVAL');
  const nextRival = collectRelationshipPairs(next.officers, 'RIVAL');

  nextRival.forEach((info, key) => {
    if (prevRival.has(key)) return;
    const [a, b] = info.ids;
    highlights.push({
      id: `rival:new:${key}`,
      label: `Rivalität entflammt: ${nameOf(lookup, a)} vs. ${nameOf(lookup, b)}`,
      icon: '⚔️',
      details:
        info.relation.sinceCycle !== undefined
          ? `Seit Zyklus ${info.relation.sinceCycle}`
          : undefined,
      score: score(2, `rival:new:${key}`)
    });
  });

  prevRival.forEach((info, key) => {
    if (nextRival.has(key)) return;
    const [a, b] = info.ids;
    highlights.push({
      id: `rival:end:${key}`,
      label: `Rivalität beigelegt: ${nameOf(lookup, a)} & ${nameOf(lookup, b)}`,
      icon: '🤝',
      details: 'Konflikt beruhigt sich',
      score: score(2, `rival:end:${key}`)
    });
  });

  return highlights;
}

function warcallHighlights(
  summary: CycleSummary | undefined,
  lookup: Map<string, Officer>
): Highlight[] {
  if (!summary) return [];
  return summary.warcallsResolved.flatMap((resolution) => {
    const participants = resolution.warcall.participants
      .map((id) => lookup.get(id))
      .filter((officer): officer is Officer => Boolean(officer));
    const hasPlayer = participants.some(
      (officer) => officer.rank === 'Spieler'
    );
    const participantNames = participants
      .map((officer) => officer.name)
      .join(', ');
    const baseId = `warcall:${resolution.warcall.id}:${summary.cycle}`;
    const initiator = nameOf(lookup, resolution.warcall.initiator);
    if (hasPlayer) {
      const base = resolution.success ? 3 : 2;
      const label = resolution.success
        ? `${initiator} triumphiert bei ${resolution.warcall.location}`
        : `${initiator} scheitert bei ${resolution.warcall.location}`;
      const icon = resolution.success ? '🏆' : '⚠️';
      const details = participantNames
        ? `Teilnehmer: ${participantNames}`
        : undefined;
      return [
        {
          id: `${baseId}:player`,
          label,
          icon,
          details,
          score: score(base, `${baseId}:player`)
        }
      ];
    }
    if (participants.length >= 4) {
      return [
        {
          id: `${baseId}:mass`,
          label: `Große Schar bei ${resolution.warcall.location} (${participants.length})`,
          icon: '⚔️',
          details: participantNames
            ? `Teilnehmer: ${participantNames}`
            : undefined,
          score: score(1, `${baseId}:mass`)
        }
      ];
    }
    return [];
  });
}

export function computeDigest(
  prev: WorldState,
  next: WorldState,
  summary?: CycleSummary
): Highlight[] {
  const lookup = buildLookup(prev, next);
  const highlights: Highlight[] = [];
  highlights.push(...promotionHighlights(summary, lookup));
  highlights.push(...deathHighlights(summary, lookup));
  highlights.push(...spawnHighlights(summary));
  highlights.push(...relationshipHighlights(prev, next, lookup));
  highlights.push(...warcallHighlights(summary, lookup));
  return highlights
    .filter(
      (item, index, arr) =>
        arr.findIndex((entry) => entry.id === item.id) === index
    )
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
