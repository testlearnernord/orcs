import { RNG } from '@sim/rng';
import type {
  Memory,
  Officer,
  OfficerStats,
  OfficerMood,
  PotentialRating,
  Rank,
  Trait
} from '@sim/types';

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
  König: 1600,
  Spieler: 1200,
  Captain: 1000,
  Späher: 500,
  Grunzer: 5 // Very low starting merit for new recruits
};

const LEVEL_RANGE: Record<Rank, [number, number]> = {
  König: [12, 14],
  Spieler: [10, 12],
  Captain: [6, 10],
  Späher: [4, 7],
  Grunzer: [1, 1]
};

function randomName(rng: RNG): string {
  return `${rng.pick(NAME_PREFIX)}${rng.pick(NAME_SUFFIX)}`;
}

function randomTraits(rng: RNG): Trait[] {
  const traits: Trait[] = [];

  // 40% chance for Archer, 40% chance for Trapper, 20% chance for Berserker (no archetype trait)
  const archetypeRoll = rng.next();
  if (archetypeRoll < 0.4) {
    traits.push('Archer');
  } else if (archetypeRoll < 0.8) {
    traits.push('Trapper');
  }
  // 20% chance to have no archetype trait (defaults to Berserker)

  // Add additional traits (30% chance for each category)
  const additionalTraits: Trait[] = [
    // Physical traits
    'Robust',
    'Weich',
    'lange Beine',
    'kurze Beine',
    // Social traits
    'Nobel',
    'Primitiv',
    'Freundlich',
    'Unfreundlich',
    // Mental traits
    'Dumm',
    'Schlau',
    'Weise'
  ];

  // 30% chance to get an additional trait
  if (rng.next() < 0.3) {
    const trait = rng.pick(additionalTraits);
    if (!traits.includes(trait)) {
      traits.push(trait);
    }
  }

  // 15% chance to get a second additional trait
  if (rng.next() < 0.15) {
    const trait = rng.pick(additionalTraits);
    if (!traits.includes(trait)) {
      traits.push(trait);
    }
  }

  return traits;
}

function randomPotential(rng: RNG): PotentialRating {
  const potentials: PotentialRating[] = [
    'Unbrauchbar',
    'Dumm',
    'Normal',
    'Fähig',
    'Überdurchschnittlich',
    'Genie'
  ];
  // Weight towards normal/average potential
  const weights = [0.05, 0.15, 0.45, 0.25, 0.08, 0.02];
  const rand = rng.next();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (rand <= sum) {
      return potentials[i];
    }
  }
  return 'Normal';
}

function randomStats(
  rng: RNG,
  rank: Rank,
  potential: PotentialRating
): OfficerStats {
  const [minLevel, maxLevel] = LEVEL_RANGE[rank];
  const level = rng.int(minLevel, maxLevel);

  // Base HP calculation
  const baseHp = 50 + level * 10;
  const maxHp = baseHp + rng.int(-5, 15);

  // Base stats influenced by potential
  const potentialMultiplier = {
    Unbrauchbar: 0.5,
    Dumm: 0.7,
    Normal: 1.0,
    Fähig: 1.3,
    Überdurchschnittlich: 1.6,
    Genie: 2.0
  }[potential];

  const baseStatRange = 20 + level * 3;
  const str = Math.round(
    (10 + rng.int(0, baseStatRange)) * potentialMultiplier
  );
  const dex = Math.round(
    (10 + rng.int(0, baseStatRange)) * potentialMultiplier
  );
  const int = Math.round(
    (10 + rng.int(0, baseStatRange)) * potentialMultiplier
  );

  return {
    potential,
    level,
    hp: maxHp,
    maxHp,
    str,
    dex,
    int
  };
}

/**
 * Get rank-appropriate ambitions that make sense for the officer's position
 * Ambitions influence officer behavior in challenges, loyalty, and relationships
 */
function getAmbitionsForRank(rank: Rank): string[] {
  switch (rank) {
    case 'König':
      // King ambitions focus on maintaining power and building legacy
      return [
        'Möchte die Horde zur stärksten machen',
        'Möchte loyale Captains aufbauen',
        'Möchte seine Herrschaft festigen',
        'Möchte ein legendäres Festmahl abhalten',
        'Möchte alle Rivalen eliminieren',
        'Möchte ein unbesiegbares Warcall-Team aufbauen',
        'Möchte in die Geschichte eingehen',
        'Möchte die besten Krieger ausbilden'
      ];
    
    case 'Spieler':
      // Player ambitions (currently unused rank, but future-proof)
      return [
        'Möchte König werden',
        'Möchte das stärkste Warcall-Team führen',
        'Möchte Verbündete im Kriegsrat sammeln',
        'Möchte seine Kampffertigkeiten perfektionieren',
        'Möchte den König herausfordern'
      ];
    
    case 'Captain':
      // Captain ambitions focus on advancement and power
      return [
        'Möchte König werden',
        'Möchte den König stürzen',
        'Möchte mehr Captains als Verbündete gewinnen',
        'Möchte seine Rivalen ausschalten',
        'Möchte das beste Warcall-Team aufbauen',
        'Möchte seine Position festigen',
        'Möchte stärker werden',
        'Möchte respektiert werden'
      ];
    
    case 'Späher':
      // Scout ambitions focus on proving themselves and advancement
      return [
        'Möchte zum Captain aufsteigen',
        'Möchte stärker werden',
        'Möchte einen Captain herausfordern',
        'Möchte Verbündete finden',
        'Möchte seinen Rivalen töten',
        'Möchte seine Kampffertigkeiten perfektionieren',
        'Möchte sich beweisen',
        'Möchte irgendwann König werden'
      ];
    
    case 'Grunzer':
      // Grunt ambitions are more modest and survival-focused
      return [
        'Möchte überleben',
        'Möchte zum Späher aufsteigen',
        'Möchte stärker werden',
        'Möchte Verbündete finden',
        'Möchte in Ruhe gelassen werden',
        'Möchte seinen ersten Kampf überstehen',
        'Möchte nicht der Schwächste sein',
        'Möchte respektiert werden',
        'Möchte seine Fähigkeiten verbessern'
      ];
    
    default:
      return ['Möchte überleben'];
  }
}

function randomMood(rng: RNG, rank: Rank): OfficerMood {
  const ambitions = getAmbitionsForRank(rank);
  const ambition = rng.pick(ambitions);

  // König has no loyalty value
  if (rank === 'König') {
    return { ambition };
  }

  // Others have loyalty to king
  const loyalitaet = rng.next() * 100; // 0-100 scale
  return { loyalitaet, ambition };
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
  const merit = Math.max(10, Math.round(BASE_MERIT[rank] + rng.int(-15, 15)));
  const id = overrides.id ?? `orc_${cycle}_${rng.int(100, 999999)}`;
  const stableId = overrides.stableId ?? id;

  const potential = randomPotential(rng);
  const stats = overrides.stats ?? randomStats(rng, rank, potential);
  const mood = overrides.mood ?? randomMood(rng, rank);

  return {
    id,
    stableId,
    name: overrides.name ?? randomName(rng),
    rank,
    merit: overrides.merit ?? merit,
    traits: overrides.traits ?? randomTraits(rng),
    stats,
    mood,
    relationships: overrides.relationships ?? [],
    status: overrides.status ?? 'ALIVE',
    cycleJoined: overrides.cycleJoined ?? cycle,
    cycleDied: overrides.cycleDied,
    memories: overrides.memories ?? []
  };
}
