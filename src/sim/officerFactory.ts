import { getPortraitSeed } from './portraits';
import { RNG } from './rng';
import type { Memory, Officer, Personality, Rank, Trait } from './types';

const NAME_PREFIX = [
  'Bog',
  'Gor',
  'Lug',
  'Maz',
  'Naz',
  'Or',
  'Ruk',
  'Shag',
  'Urz',
  'Zog'
];
const NAME_SUFFIX = [
  'dak',
  'gash',
  'muk',
  'nak',
  'rag',
  'ruk',
  'snak',
  'thor',
  'zug',
  'zul'
];

const BASE_MERIT: Record<Rank, number> = {
  König: 220,
  Spieler: 160,
  Captain: 120,
  Späher: 80,
  Grunzer: 40
};

const LEVEL_RANGE: Record<Rank, [number, number]> = {
  König: [12, 14],
  Spieler: [10, 12],
  Captain: [6, 10],
  Späher: [4, 7],
  Grunzer: [2, 5]
};

function randomName(rng: RNG): string {
  return `${rng.pick(NAME_PREFIX)}${rng.pick(NAME_SUFFIX)}`;
}

function randomTraits(rng: RNG): Trait[] {
  const all: Trait[] = [
    'Feigling',
    'Berserker',
    'Hinterhältig',
    'Trinkfest',
    'Tierjäger',
    'Intrigant'
  ];
  const count = rng.chance(0.3) ? 2 : 1;
  return rng.shuffle(all).slice(0, count);
}

function randomPersonality(rng: RNG): Personality {
  return {
    gier: rng.next(),
    tapferkeit: rng.next(),
    loyalitaet: rng.next(),
    stolz: rng.next()
  };
}

export function addMemory(
  officer: Officer,
  memory: Memory,
  limit = 16
): Officer {
  const memories = [...officer.memories, memory];
  if (memories.length > limit) {
    memories.splice(0, memories.length - limit);
  }
  return { ...officer, memories };
}

export function createOfficer(
  rng: RNG,
  rank: Rank,
  cycle: number,
  overrides: Partial<Officer> = {}
): Officer {
  const [minLevel, maxLevel] = LEVEL_RANGE[rank];
  const level = rng.int(minLevel, maxLevel);
  const merit = Math.max(10, Math.round(BASE_MERIT[rank] + rng.int(-15, 15)));
  const id = overrides.id ?? `orc_${cycle}_${rng.int(100, 999999)}`;
  const portraitSeed = overrides.portraitSeed ?? getPortraitSeed(id);

  return {
    id,
    name: overrides.name ?? randomName(rng),
    rank,
    level: overrides.level ?? level,
    merit: overrides.merit ?? merit,
    traits: overrides.traits ?? randomTraits(rng),
    personality: overrides.personality ?? randomPersonality(rng),
    relationships: overrides.relationships ?? [],
    portraitSeed,
    status: overrides.status ?? 'ALIVE',
    cycleJoined: overrides.cycleJoined ?? cycle,
    cycleDied: overrides.cycleDied,
    memories: overrides.memories ?? []
  };
}
