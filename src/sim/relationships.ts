import { BLOOD_OATH_DURATION, RELATIONSHIP_BONUS } from '@sim/constants';
import { createRelationshipEntry } from '@sim/feed';
import { addMemory } from '@sim/officerFactory';
import type {
  FeedEntry,
  Officer,
  Relationship,
  RelationshipType,
  WorldState
} from '@sim/types';
import { RNG } from '@sim/rng';

function replaceRelationship(
  officer: Officer,
  relationship: Relationship
): Officer {
  const others = officer.relationships.filter(
    (rel) => rel.with !== relationship.with
  );
  return { ...officer, relationships: [...others, relationship] };
}

function findOfficer(state: WorldState, id: string): Officer | undefined {
  return state.officers.find((officer) => officer.id === id);
}

function updateOfficer(state: WorldState, updated: Officer): void {
  state.officers = state.officers.map((officer) =>
    officer.id === updated.id ? updated : officer
  );
}

export function formRelationship(
  state: WorldState,
  firstId: string,
  secondId: string,
  type: RelationshipType,
  cycle: number,
  rng: RNG
): FeedEntry | undefined {
  if (firstId === secondId) return undefined;
  const first = findOfficer(state, firstId);
  const second = findOfficer(state, secondId);
  if (!first || !second) return undefined;

  const expiresAt =
    type === 'BLOOD_OATH' ? cycle + BLOOD_OATH_DURATION : undefined;

  const firstRelation: Relationship = {
    with: second.id,
    type,
    sinceCycle: cycle,
    expiresAtCycle: expiresAt
  };
  const secondRelation: Relationship = {
    with: first.id,
    type,
    sinceCycle: cycle,
    expiresAtCycle: expiresAt
  };

  let updatedFirst = replaceRelationship(first, firstRelation);
  let updatedSecond = replaceRelationship(second, secondRelation);

  updatedFirst = addMemory(updatedFirst, {
    cycle,
    category: type === 'BLOOD_OATH' ? 'BLOOD_OATH' : 'RELATIONSHIP',
    summary: `${type} mit ${updatedSecond.name}`
  });
  updatedSecond = addMemory(updatedSecond, {
    cycle,
    category: type === 'BLOOD_OATH' ? 'BLOOD_OATH' : 'RELATIONSHIP',
    summary: `${type} mit ${updatedFirst.name}`
  });

  updateOfficer(state, updatedFirst);
  updateOfficer(state, updatedSecond);

  return createRelationshipEntry(rng, cycle, updatedFirst, updatedSecond, type);
}

export function seedSpawnRelationships(
  state: WorldState,
  officer: Officer,
  rng: RNG
): FeedEntry[] {
  const feed: FeedEntry[] = [];
  const others = state.officers.filter(
    (candidate) => candidate.id !== officer.id
  );
  if (others.length === 0) return feed;

  const attempts = rng.chance(0.4) ? 2 : 1;
  for (let i = 0; i < attempts; i += 1) {
    const partner = rng.pick(others);
    const roll = rng.next();
    let type: RelationshipType | undefined;
    if (roll < 0.05) type = 'BLOOD_OATH';
    else if (roll < 0.2) type = 'RIVAL';
    else if (roll < 0.5) type = 'ALLY';
    else if (roll < 0.7) type = 'FRIEND';

    if (!type) continue;

    const entry = formRelationship(
      state,
      officer.id,
      partner.id,
      type,
      state.cycle,
      rng
    );
    if (entry) {
      feed.push(entry);
    }
  }

  return feed;
}

export function expireBloodOaths(
  state: WorldState,
  cycle: number,
  rng: RNG
): FeedEntry[] {
  const feed: FeedEntry[] = [];
  const processed = new Set<string>();
  for (const officer of state.officers) {
    for (const relation of officer.relationships) {
      if (relation.type !== 'BLOOD_OATH') continue;
      if (
        relation.expiresAtCycle === undefined ||
        relation.expiresAtCycle > cycle
      )
        continue;
      const pairKey = [officer.id, relation.with].sort().join(':');
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      const partner = findOfficer(state, relation.with);
      if (!partner) continue;
      const loyalty =
        (officer.personality.loyalitaet + partner.personality.loyalitaet) / 2;
      const pride = (officer.personality.stolz + partner.personality.stolz) / 2;
      const greed = (officer.personality.gier + partner.personality.gier) / 2;
      let targetType: RelationshipType = 'ALLY';
      if (greed > loyalty && pride > loyalty) {
        targetType = 'RIVAL';
      }
      const entry = formRelationship(
        state,
        officer.id,
        partner.id,
        targetType,
        cycle,
        rng
      );
      if (entry) feed.push(entry);
    }
  }
  return feed;
}

export function collectBloodOathVictims(
  state: WorldState,
  fallen: Set<string>,
  cycle: number
): Set<string> {
  const extra = new Set<string>();
  const queue = [...fallen];
  while (queue.length > 0) {
    const id = queue.pop();
    if (!id) continue;
    const officer = findOfficer(state, id);
    if (!officer) continue;
    for (const relation of officer.relationships) {
      if (relation.type !== 'BLOOD_OATH') continue;
      if (
        relation.expiresAtCycle !== undefined &&
        relation.expiresAtCycle <= cycle
      )
        continue;
      if (fallen.has(relation.with) || extra.has(relation.with)) continue;
      extra.add(relation.with);
      queue.push(relation.with);
    }
  }
  return extra;
}

export function relationshipModifier(
  officer: Officer,
  participants: Officer[]
): number {
  let modifier = 0;
  for (const relation of officer.relationships) {
    const target = participants.find((member) => member.id === relation.with);
    if (!target) continue;
    const weight = RELATIONSHIP_BONUS[relation.type];
    if (typeof weight === 'number') {
      modifier += weight;
    }
  }
  return modifier;
}
