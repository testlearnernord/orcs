import { TRAIT_COMBAT_WEIGHTS } from '@sim/constants';
import { createWarcallEntry } from '@sim/feed';
import { addMemory } from '@sim/officerFactory';
import { relationshipModifier } from '@sim/relationships';
import { RNG } from '@sim/rng';
import type {
  Officer,
  OrcId,
  WarcallBreakdown,
  WarcallKind,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from '@sim/types';

const LOCATIONS = [
  'Schädelhügel',
  'Schlackengrube',
  'Pilzwald',
  'Aschepass',
  'Knochenarena',
  'Teersümpfe'
];

const WARCALL_KINDS: WarcallPlan['kind'][] = [
  'Feast',
  'Hunt',
  'Ambush',
  'Duel',
  'Monsterjagd',
  'Diplomatie',
  'Infiltration', // New: Stealth mission requiring Archer/Trapper
  'Eroberung', // New: Territory conquest requiring mixed team
  'Sabotage' // New: Disruption with betrayal mechanics
];

const REWARD_HINTS = [
  'Neue Waffenversorgung',
  'Rufzuwachs',
  'Sonderrechte im Hof',
  'Seltene Trophäe',
  'Strategischer Vorteil',
  'Geheiminformationen',
  'Territoriumsgewinn',
  'Handelspartner',
  'Magische Artefakte',
  'Veteranentraining',
  'Spionage-Netzwerk', // For Infiltration
  'Festung-Kontrolle', // For Eroberung
  'Sabotage-Expertise', // For Sabotage
  'Versteckte Allianzen', // Hidden reward
  'Schwarzmarkt-Zugang' // Special reward for antagonists
];

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function ensureParticipants(
  state: WorldState,
  warcall: WarcallPlan
): Officer[] {
  const participants: Officer[] = [];
  for (const id of warcall.participants) {
    const officer = state.officers.find((candidate) => candidate.id === id);
    if (officer) participants.push(officer);
  }
  return participants;
}

export function calculateBreakdown(
  rng: RNG,
  warcall: WarcallPlan,
  participants: Officer[],
  kingStatus: WorldState['kingStatus']
): WarcallBreakdown {
  // Improved base success rate - less punishing difficulty
  let base = 0.6 - warcall.baseDifficulty * 0.4;
  if (kingStatus === 'UNGEFESTIGT') {
    base -= 0.15; // Reduced penalty for unstable king
  }
  const traitScore = participants.reduce((sum, officer) => {
    const officerBonus = officer.traits.reduce(
      (acc, trait) => acc + (TRAIT_COMBAT_WEIGHTS[trait] ?? 0),
      0
    );
    return sum + officerBonus;
  }, 0);
  const relationshipScore = participants.reduce(
    (sum, officer) => sum + relationshipModifier(officer, participants),
    0
  );
  const normalizedTrait = traitScore / Math.max(participants.length, 1);
  const normalizedRel = relationshipScore / Math.max(participants.length, 1);
  // Reduced randomness impact for more predictable outcomes
  const random = (rng.fork(`warcall:${warcall.id}`).next() - 0.5) * 0.8;
  const logisticInput = base + normalizedTrait + normalizedRel + random;
  return {
    base,
    traits: normalizedTrait,
    relationships: normalizedRel,
    random,
    logistic: logisticInput
  };
}

function determineCasualties(
  rng: RNG,
  participants: Officer[],
  success: boolean,
  kingStatus: WorldState['kingStatus']
): OrcId[] {
  if (participants.length === 0) return [];
  if (success) return [];

  // Significantly reduced casualty rate - UNGEFESTIGT only adds 20% chance of extra casualty
  if (
    kingStatus === 'UNGEFESTIGT' &&
    participants.length > 1 &&
    rng.chance(0.2)
  ) {
    const shuffled = rng.shuffle(participants);
    return shuffled.slice(0, 2).map((officer) => officer.id);
  }

  // Regular casualties should be infrequent - only 50% chance of death on failure
  if (rng.chance(0.5)) {
    const unlucky = rng.pick(participants);
    return [unlucky.id];
  }

  return [];
}

function applyMerit(
  officer: Officer,
  success: boolean,
  kingStatus: WorldState['kingStatus'],
  warcallKind?: WarcallKind
): Officer {
  let delta = success ? 20 : Math.max(-10, -officer.merit * 0.1);

  // Special handling for antagonists in failed missions
  if (
    !success &&
    warcallKind &&
    ['Infiltration', 'Sabotage'].includes(warcallKind)
  ) {
    // Antagonists (betrayers) in failed stealth missions still gain some merit/exp
    if (
      officer.traits.includes('Verräter') ||
      officer.traits.includes('Geheimnisvoll')
    ) {
      delta = Math.max(delta, 5); // Minimum +5 merit for successful betrayal
    }
  }

  // Ambitious officers get bonus merit for successful complex operations
  if (
    success &&
    warcallKind &&
    ['Eroberung', 'Infiltration'].includes(warcallKind)
  ) {
    if (officer.traits.includes('Unfreundlich') || officer.rank === 'Captain') {
      delta += 5; // Bonus merit for ambitious officers in complex missions
    }
  }

  if (success && kingStatus === 'UNGEFESTIGT') {
    delta /= 2;
  }

  return { ...officer, merit: Math.max(0, officer.merit + delta) };
}

export function resolveWarcall(
  state: WorldState,
  rng: RNG,
  warcall: WarcallPlan
): WarcallResolution {
  const participants = ensureParticipants(state, warcall);
  const breakdown = calculateBreakdown(
    rng,
    warcall,
    participants,
    state.kingStatus
  );
  const chance = logistic(breakdown.logistic);
  const success = rng.fork(`resolve:${warcall.id}`).next() <= chance;
  warcall.breakdown = breakdown;

  const casualties = determineCasualties(
    rng.fork(`casualties:${warcall.id}`),
    participants,
    success,
    state.kingStatus
  );
  const feedEntry = createWarcallEntry(
    rng,
    state.cycle,
    warcall,
    success,
    breakdown
  );

  for (const officer of participants) {
    const updated = addMemory(
      applyMerit(officer, success, state.kingStatus, warcall.kind),
      {
        cycle: state.cycle,
        category: 'WARCALL',
        summary: `${success ? 'Triumph' : 'Schmach'} bei ${warcall.location}`,
        details: `Chance ${(chance * 100).toFixed(1)}%`
      }
    );
    state.officers = state.officers.map((candidate) =>
      candidate.id === updated.id ? updated : candidate
    );
  }

  return {
    warcall,
    success,
    casualties,
    feed: [feedEntry]
  };
}

function pickParticipants(
  rng: RNG,
  officers: Officer[],
  amount: number
): Officer[] {
  const pool = officers.filter(
    (officer) => officer.status === 'ALIVE' && officer.rank !== 'König'
  );
  const selected: Officer[] = [];
  const shuffled = rng.shuffle(pool);
  for (let i = 0; i < Math.min(amount, shuffled.length); i += 1) {
    selected.push(shuffled[i]);
  }
  return selected;
}

export function planWarcall(
  state: WorldState,
  rng: RNG,
  cycle: number
): WarcallPlan | undefined {
  const participants = pickParticipants(rng, state.officers, 3);
  if (participants.length === 0) return undefined;

  const initiator = rng.pick(participants);
  const kind = rng.pick(WARCALL_KINDS);

  // Apply specific rules for new warcall types
  const warcallConfig = getWarcallConfig(kind, participants, rng);
  const risk = Math.min(
    1,
    Math.max(0, rng.next() * warcallConfig.riskMultiplier)
  );

  return {
    id: `warcall_${cycle}_${rng.int(100, 999999)}`,
    cycleAnnounced: cycle,
    resolveOn: cycle + warcallConfig.duration,
    initiator: initiator.id,
    participants: warcallConfig.finalParticipants.map((officer) => officer.id),
    location: rng.pick(LOCATIONS),
    baseDifficulty: rng.next() * warcallConfig.difficultyMultiplier,
    kind,
    risk,
    rewardHint: warcallConfig.rewardHint
  };
}

/**
 * Get configuration for specific warcall types including participants, duration, and rewards
 */
function getWarcallConfig(
  kind: WarcallKind,
  participants: Officer[],
  rng: RNG
): {
  finalParticipants: Officer[];
  duration: number;
  riskMultiplier: number;
  difficultyMultiplier: number;
  rewardHint: string;
} {
  const config = {
    finalParticipants: participants,
    duration: 1,
    riskMultiplier: 1.0,
    difficultyMultiplier: 1.0,
    rewardHint: rng.pick(REWARD_HINTS)
  };

  switch (kind) {
    case 'Infiltration':
      // Requires stealth specialists (Archer/Trapper preferred)
      config.finalParticipants = participants.filter(
        (officer) =>
          officer.traits.includes('Archer') ||
          officer.traits.includes('Trapper')
      );
      if (config.finalParticipants.length === 0) {
        config.finalParticipants = participants.slice(0, 2); // Fallback to 2 officers
      }
      config.duration = 2; // Takes longer
      config.riskMultiplier = 1.3; // Higher risk
      config.rewardHint = rng.pick([
        'Spionage-Netzwerk',
        'Geheiminformationen',
        'Versteckte Allianzen'
      ]);
      break;

    case 'Eroberung': {
      // Requires mixed team with different archetypes
      const archetypes = ['Archer', 'Trapper'];
      const archetypeParticipants = participants.filter((officer) =>
        officer.traits.some((trait) => archetypes.includes(trait))
      );
      const berserkers = participants.filter(
        (officer) =>
          !officer.traits.includes('Archer') &&
          !officer.traits.includes('Trapper')
      );

      // Ensure mixed team
      config.finalParticipants = [
        ...archetypeParticipants.slice(0, 2),
        ...berserkers.slice(0, 2)
      ].slice(0, 4); // Up to 4 participants for conquest

      config.duration = 3; // Longest duration
      config.difficultyMultiplier = 1.4; // Higher difficulty
      config.rewardHint = rng.pick([
        'Territoriumsgewinn',
        'Festung-Kontrolle',
        'Strategischer Vorteil'
      ]);
      break;
    }

    case 'Sabotage': {
      // High risk, high reward with potential betrayal
      config.finalParticipants = participants.slice(0, 2); // Small team
      config.riskMultiplier = 1.5; // Very high risk
      config.difficultyMultiplier = 0.8; // Lower difficulty but higher chance of betrayal

      // Check for untrustworthy officers
      const hasBetrayer = participants.some(
        (officer) =>
          officer.traits.includes('Verräter') ||
          officer.traits.includes('Unfreundlich')
      );

      if (hasBetrayer) {
        config.rewardHint = rng.pick([
          'Schwarzmarkt-Zugang',
          'Sabotage-Expertise'
        ]);
      } else {
        config.rewardHint = rng.pick([
          'Sabotage-Expertise',
          'Geheiminformationen'
        ]);
      }
      break;
    }

    default:
      // Default behavior for existing warcall types
      break;
  }

  return config;
}

export function resolveDueWarcalls(
  state: WorldState,
  rng: RNG
): WarcallResolution[] {
  const due = state.warcalls.filter(
    (warcall) => warcall.resolveOn <= state.cycle
  );
  const remaining = state.warcalls.filter(
    (warcall) => warcall.resolveOn > state.cycle
  );
  const resolutions = due.map((warcall) => resolveWarcall(state, rng, warcall));
  state.warcalls = remaining;
  return resolutions;
}

export function enqueuePlannedWarcalls(
  state: WorldState,
  planned: WarcallPlan[]
): void {
  state.warcalls = [...state.warcalls, ...planned];
}

export function warcallTooltip(resolution: WarcallResolution): string {
  const breakdown = resolution.warcall.breakdown;
  if (!breakdown) return 'Keine Daten';
  const chance = logistic(breakdown.logistic) * 100;
  return `Chance ${chance.toFixed(1)}%\nBasis: ${breakdown.base.toFixed(2)}\nTraits: ${breakdown.traits.toFixed(2)}\nBeziehungen: ${breakdown.relationships.toFixed(2)}\nZufall: ${breakdown.random.toFixed(2)}`;
}
