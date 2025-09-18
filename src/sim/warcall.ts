import { TRAIT_COMBAT_WEIGHTS } from './constants';
import { createWarcallEntry } from './feed';
import { addMemory } from './officerFactory';
import { relationshipModifier } from './relationships';
import { RNG } from './rng';
import type {
  Officer,
  OrcId,
  WarcallBreakdown,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from './types';

const LOCATIONS = [
  'Schädelhügel',
  'Schlackengrube',
  'Pilzwald',
  'Aschepass',
  'Knochenarena',
  'Teersümpfe'
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
  let base = 0.5 - warcall.baseDifficulty;
  if (kingStatus === 'UNGEFESTIGT') {
    base -= 0.2;
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
  const random = rng.fork(`warcall:${warcall.id}`).next() - 0.5;
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
  if (kingStatus === 'UNGEFESTIGT' && participants.length > 1) {
    const shuffled = rng.shuffle(participants);
    return shuffled.slice(0, 2).map((officer) => officer.id);
  }
  const unlucky = rng.pick(participants);
  return [unlucky.id];
}

function applyMerit(
  officer: Officer,
  success: boolean,
  kingStatus: WorldState['kingStatus']
): Officer {
  let delta = success ? 20 : Math.max(-10, -officer.merit * 0.1);
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
    const updated = addMemory(applyMerit(officer, success, state.kingStatus), {
      cycle: state.cycle,
      category: 'WARCALL',
      summary: `${success ? 'Triumph' : 'Schmach'} bei ${warcall.location}`,
      details: `Chance ${(chance * 100).toFixed(1)}%`
    });
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
  return {
    id: `warcall_${cycle}_${rng.int(100, 999999)}`,
    cycleAnnounced: cycle,
    resolveOn: cycle + 1,
    initiator: initiator.id,
    participants: participants.map((officer) => officer.id),
    location: rng.pick(LOCATIONS),
    baseDifficulty: rng.next()
  };
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
