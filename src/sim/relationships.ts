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

  const expiresAt = undefined; // No special expiration for any relationship type

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
    category: 'RELATIONSHIP',
    summary: `${type} mit ${updatedSecond.name}`
  });
  updatedSecond = addMemory(updatedSecond, {
    cycle,
    category: 'RELATIONSHIP',
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
    if (roll < 0.15) type = 'RIVAL';
    else if (roll < 0.45) type = 'ALLY';
    // Remove neutral - anything else is implicitly neutral (no relationship)

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
  // No more blood oaths to expire
  return [];
}

export function collectBloodOathVictims(
  state: WorldState,
  fallen: Set<string>,
  cycle: number
): Set<string> {
  // No more blood oath victims since blood oaths don't exist
  return new Set<string>();
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
