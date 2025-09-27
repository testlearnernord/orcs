import { addMemory } from '@sim/officerFactory';
import { createGeneralEntry } from '@sim/feed';
import { RNG } from '@sim/rng';
import type {
  CrownState,
  FeedEntry,
  Officer,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from '@sim/types';

const TRIBUTE_MIN = 0.1;
const TRIBUTE_MAX = 0.25;
const TRIBUTE_INCREMENT = 0.002;
const BLOOD_OATH_PRESSURE_REDUCTION = 0.005;
const BLOOD_OATH_TRIBUTE_BONUS = 0.01;
const BASE_PRESSURE_GAIN = 0.001;
const SHAKY_PRESSURE_GAIN = 0.005;
const CRISIS_PRESSURE_GAIN = 0.015;
const DECAY_TAPFERKEIT = 0.0015;
const DECAY_LOYALITAET = 0.0005;
const DECAY_STOLZ = 0.0005;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function hasBloodOathWithKing(officer: Officer, kingId: string): boolean {
  return officer.relationships.some(
    (relation) => relation.type === 'BLOOD_OATH' && relation.with === kingId
  );
}

export function createInitialCrownState(rng: RNG): CrownState {
  return {
    reignCycles: 0,
    crownPressure: 0,
    tributeRate: TRIBUTE_MIN + rng.next() * 0.05,
    instability: 'stable'
  };
}

export function resetCrown(state: WorldState, rng: RNG, king: Officer): void {
  const fork = rng.fork(`crown:reset:${king.id}`);
  state.crown = createInitialCrownState(fork);
}

function applyTributeLoyalty(
  state: WorldState,
  king: Officer,
  tributeRate: number
): void {
  const penalty = Math.max(0, tributeRate - TRIBUTE_MIN) * 0.03;
  if (penalty <= 0) return;
  state.officers = state.officers.map((officer) => {
    if (officer.id === king.id) return officer;
    const loyalty = clamp(officer.personality.loyalitaet - penalty);
    if (loyalty === officer.personality.loyalitaet) return officer;
    return {
      ...officer,
      personality: { ...officer.personality, loyalitaet: loyalty }
    };
  });
}

function applyReignDecay(state: WorldState, king: Officer): Officer {
  const updated: Officer = {
    ...king,
    personality: {
      ...king.personality,
      tapferkeit: clamp(king.personality.tapferkeit - DECAY_TAPFERKEIT),
      loyalitaet: clamp(king.personality.loyalitaet - DECAY_LOYALITAET),
      stolz: clamp(king.personality.stolz + DECAY_STOLZ)
    }
  };
  state.officers = state.officers.map((officer) =>
    officer.id === king.id ? updated : officer
  );
  return updated;
}

function evaluateInstability(
  state: WorldState,
  king: Officer
): {
  instability: CrownState['instability'];
  avgLoyalty: number;
  rivalCount: number;
} {
  const subordinates = state.officers.filter(
    (officer) => officer.id !== king.id && officer.status === 'ALIVE'
  );
  const top = [...subordinates].sort((a, b) => b.merit - a.merit).slice(0, 8);
  const avgLoyalty =
    top.length === 0
      ? 0.5
      : top.reduce((sum, officer) => sum + officer.personality.loyalitaet, 0) /
        top.length;
  const rivalCount = subordinates.reduce((count, officer) => {
    const rival = officer.relationships.some(
      (relation) => relation.type === 'RIVAL' && relation.with === king.id
    );
    return rival ? count + 1 : count;
  }, 0);
  let instability: CrownState['instability'] = 'stable';
  if (avgLoyalty < 0.28 || rivalCount >= 5) {
    instability = 'crisis';
  } else if (avgLoyalty < 0.35 || rivalCount >= 3) {
    instability = 'shaky';
  }
  return { instability, avgLoyalty, rivalCount };
}

export function computeReignPressure(
  crown: CrownState,
  instability: CrownState['instability'],
  hasBloodOath: boolean
): number {
  let pressure = crown.crownPressure;
  if (instability === 'crisis') {
    pressure += CRISIS_PRESSURE_GAIN;
  } else if (instability === 'shaky') {
    pressure += SHAKY_PRESSURE_GAIN;
  } else {
    pressure += BASE_PRESSURE_GAIN;
  }
  if (hasBloodOath) {
    pressure = Math.max(0, pressure - BLOOD_OATH_PRESSURE_REDUCTION);
  }
  return clamp(pressure, 0, 1);
}

function coupScore(officer: Officer, kingId: string): number {
  const { gier, tapferkeit, loyalitaet } = officer.personality;
  const rivalBonus = officer.relationships.some(
    (relation) => relation.type === 'RIVAL' && relation.with === kingId
  )
    ? 0.5
    : 0;
  const oathPenalty = hasBloodOathWithKing(officer, kingId) ? -0.8 : 0;
  return (
    tapferkeit * 0.7 +
    (1 - loyalitaet) * 0.9 +
    gier * 0.4 +
    rivalBonus +
    oathPenalty +
    officer.merit / 140
  );
}

function challengerStrength(officer: Officer, kingId: string): number {
  const { tapferkeit, loyalitaet, gier } = officer.personality;
  const rival = officer.relationships.some(
    (relation) => relation.type === 'RIVAL' && relation.with === kingId
  )
    ? 0.6
    : 0;
  const oathPenalty = hasBloodOathWithKing(officer, kingId) ? -0.5 : 0;
  return (
    tapferkeit * 0.8 +
    (1 - loyalitaet) * 0.8 +
    gier * 0.3 +
    officer.merit / 120 +
    rival +
    oathPenalty
  );
}

function kingStrength(
  king: Officer,
  instability: CrownState['instability']
): number {
  let strength =
    king.personality.tapferkeit * 1.1 +
    king.personality.loyalitaet * 0.6 +
    king.merit / 120 +
    king.level * 0.05 +
    king.personality.stolz * 0.2;
  if (instability === 'shaky') {
    strength *= 0.92;
  }
  if (instability === 'crisis') {
    strength *= 0.85;
  }
  return strength;
}

function adjustOfficers(
  state: WorldState,
  updates: Map<string, Officer>
): void {
  state.officers = state.officers.map(
    (officer) => updates.get(officer.id) ?? officer
  );
}

function triggerThroneBattle(
  state: WorldState,
  rng: RNG,
  king: Officer,
  crown: CrownState,
  feed: FeedEntry[]
): {
  resolution: WarcallResolution;
  casualties: string[];
  pressure: number;
} | null {
  // Only trigger throne battles when crown pressure is high enough
  if (crown.crownPressure < 0.4) return null;

  const pool = state.officers.filter(
    (officer) => officer.id !== king.id && officer.status === 'ALIVE'
  );
  if (pool.length === 0) return null;
  const scored = pool
    .map((officer) => ({ officer, score: coupScore(officer, king.id) }))
    .sort((a, b) => b.score - a.score);
  const leaderEntry = scored[0];
  if (!leaderEntry) return null;

  // Higher threshold for actually starting a battle - need strong challenger
  if (leaderEntry.score < 0.4) return null;

  let leader = leaderEntry.officer;
  let remaining = scored.slice(1);
  if (leaderEntry.score < 0.3 && remaining.length > 0) {
    const next = remaining.find(
      (entry) => entry.score > leaderEntry.score + 0.1
    );
    if (next) {
      leader = next.officer;
      remaining = scored.filter((entry) => entry.officer.id !== leader.id);
    }
  }
  let supporters: Officer[] = [];
  const viable = remaining.filter((entry) => entry.score > 0.2);
  if (viable.length > 0) {
    supporters = rng
      .shuffle(viable.map((entry) => entry.officer))
      .slice(0, Math.min(2, viable.length));
  }
  if (supporters.length === 0) {
    const fallback = pool.find((officer) => officer.id !== leader.id);
    if (fallback) supporters = [fallback];
  }
  const challengers = [leader, ...supporters];

  const challengerStrengthSum = challengers.reduce(
    (sum, officer) => sum + challengerStrength(officer, king.id),
    0
  );
  const instability = crown.instability;
  let power = challengerStrengthSum * (1 + crown.crownPressure * 0.6);
  if (instability === 'shaky') power *= 1.12;
  if (instability === 'crisis') power *= 1.35;
  const defense = kingStrength(king, instability);
  const baseChance = power <= 0 ? 0.1 : power / (power + defense);
  const noise = rng.fork(`crown:noise:${state.cycle}`).next() * 0.2 - 0.1;
  const chance = clamp(
    baseChance + noise + crown.crownPressure * 0.1,
    0.05,
    0.95
  );
  const challengersWin =
    rng.fork(`crown:resolve:${state.cycle}`).next() < chance;

  const casualties: string[] = [];
  if (challengersWin) {
    casualties.push(king.id);
    // Reduced likelihood of extra casualties in throne battles
    if (
      rng.fork(`crown:spill:${state.cycle}`).next() > 0.8 &&
      challengers.length > 1
    ) {
      const fallen = rng.fork(`crown:support:${state.cycle}`).pick(supporters);
      casualties.push(fallen.id);
    }
  } else {
    // Only 50% chance someone dies when challengers lose
    if (rng.fork(`crown:leader-death:${state.cycle}`).next() < 0.5) {
      const fallenLeader = rng
        .fork(`crown:leader:${state.cycle}`)
        .pick(challengers);
      casualties.push(fallenLeader.id);
      if (
        rng.fork(`crown:return:${state.cycle}`).next() > 0.85 &&
        supporters.length > 0
      ) {
        const extra = rng
          .fork(`crown:return-extra:${state.cycle}`)
          .pick(supporters);
        if (!casualties.includes(extra.id)) {
          casualties.push(extra.id);
        }
      }
    }
  }

  const updates = new Map<string, Officer>();
  const summaryWinners = challengersWin
    ? 'Thronschlacht: Thron erobert'
    : 'Thronschlacht gescheitert';
  const summaryKing = challengersWin
    ? 'Thronschlacht verloren'
    : 'Thronschlacht abgewehrt';

  if (!challengersWin) {
    const meritGain = 25;
    const updatedKing = addMemory(
      {
        ...king,
        merit: Math.max(0, king.merit + meritGain)
      },
      {
        cycle: state.cycle,
        category: 'WARCALL',
        summary: summaryKing,
        details: 'Hof verteidigt'
      }
    );
    updates.set(updatedKing.id, updatedKing);
  }

  challengers.forEach((officer, index) => {
    const fallen = casualties.includes(officer.id);
    if (fallen) return;
    const meritDelta = challengersWin
      ? index === 0
        ? 35
        : 22
      : index === 0
        ? -18
        : -12;
    const updated = addMemory(
      {
        ...officer,
        merit: Math.max(0, officer.merit + meritDelta)
      },
      {
        cycle: state.cycle,
        category: 'WARCALL',
        summary: summaryWinners
      }
    );
    updates.set(updated.id, updated);
  });

  adjustOfficers(state, updates);

  const outcomeText = challengersWin
    ? `${leader.name} stürzt ${king.name}.`
    : `${king.name} hält ${leader.name} nieder.`;
  const entry = createGeneralEntry(
    rng,
    state.cycle,
    `Thronschlacht! ${outcomeText}`
  );
  feed.push(entry);

  const plan: WarcallPlan = {
    id: `throne_${state.cycle}_${Math.floor(rng.next() * 1_000_000)}`,
    cycleAnnounced: state.cycle,
    resolveOn: state.cycle,
    initiator: leader.id,
    participants: [king.id, ...challengers.map((officer) => officer.id)],
    location: 'Thronsaal',
    baseDifficulty: 0.65,
    kind: 'Thronschlacht',
    risk: 0.95,
    rewardHint: 'Thronanspruch'
  };
  plan.breakdown = {
    base: chance,
    traits: challengerStrengthSum,
    relationships: -kingStrength(king, instability),
    random: noise,
    logistic: chance
  };

  const resolution: WarcallResolution = {
    warcall: plan,
    success: challengersWin,
    casualties,
    feed: [entry]
  };

  const pressure = challengersWin
    ? 0
    : Math.max(0.15, crown.crownPressure * 0.45);

  return { resolution, casualties, pressure };
}

export function updateCrownState(
  state: WorldState,
  rng: RNG,
  feed: FeedEntry[]
): { casualties: string[]; resolution?: WarcallResolution } {
  const king = state.officers.find((officer) => officer.id === state.kingId);
  if (!king) {
    state.crown.instability = 'stable';
    state.crown.crownPressure = 0;
    return { casualties: [] };
  }
  const crown = state.crown;
  const previousReign = crown.reignCycles;
  crown.reignCycles += 1;

  const bloodOath = king.relationships.some(
    (relation) => relation.type === 'BLOOD_OATH'
  );
  crown.tributeRate = Math.min(
    TRIBUTE_MAX,
    crown.tributeRate +
      TRIBUTE_INCREMENT +
      (bloodOath ? BLOOD_OATH_TRIBUTE_BONUS : 0)
  );
  applyTributeLoyalty(state, king, crown.tributeRate);

  let currentKing = king;
  if (crown.reignCycles > 20) {
    currentKing = applyReignDecay(state, king);
  }

  const instabilityInfo = evaluateInstability(state, currentKing);
  crown.instability = instabilityInfo.instability;
  crown.crownPressure = computeReignPressure(
    crown,
    crown.instability,
    bloodOath
  );

  if (previousReign < 120 && crown.reignCycles >= 120) {
    crown.crownPressure = Math.max(crown.crownPressure, 0.8);
    feed.push(
      createGeneralEntry(
        rng,
        state.cycle,
        'Hofintrigen eskalieren – der Thron steht unter Dauerbelagerung.'
      )
    );
  }

  const result = triggerThroneBattle(state, rng, currentKing, crown, feed);
  if (result) {
    crown.crownPressure = result.pressure;
    return { casualties: result.casualties, resolution: result.resolution };
  }

  return { casualties: [] };
}
