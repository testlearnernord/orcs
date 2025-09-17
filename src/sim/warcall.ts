import { LOCATIONS, WARCALL_ACTIVE_MAX, WARCALL_ACTIVE_MIN } from "./constants";
import { Officer, Warcall, WarcallResolution, WarcallSource, WarcallType, WorldState } from "./types";
import { RNG } from "./rng";
import { OfficerManager } from "./officerManager";
import { resolveWarcallCombat } from "./simulation";

function createWarcallId(state: WorldState, rng: RNG): string {
  return `wc_${state.cycle}_${state.warcalls.length}_${Math.round(rng.next() * 1e6)}`;
}

function chooseSource(rng: RNG): WarcallSource {
  const value = rng.next();
  if (value < 0.5) return "AGENDA";
  if (value < 0.8) return "RANDOM";
  return "PLAYER";
}

function weightedTypeFromAgenda(initiator: Officer): WarcallType {
  if (initiator.personality.aggression > 0.7) return "OVERFALL";
  if (initiator.personality.opportunism > 0.6) return "ASSASSINATION";
  if (initiator.rank === "König") return "PURGE";
  return "FEAST";
}

function randomType(rng: RNG): WarcallType {
  return rng.pick(["HUNT", "MONSTER_HUNT", "FEAST", "OVERFALL"]);
}

function pickParticipants(rng: RNG, state: WorldState, initiator: Officer, max: number, includePlayer: boolean): Officer[] {
  const pool = state.officers.filter(o => o.status === "ALIVE" && o.id !== initiator.id);
  const sorted = rng.shuffle(pool);
  if (sorted.length === 0) return [initiator];
  const limit = Math.max(1, Math.min(max, sorted.length));
  const count = rng.int(1, limit);
  const participants = sorted.slice(0, count);
  if (includePlayer) {
    const player = state.officers.find(o => o.id === state.playerId && o.status === "ALIVE");
    if (player && !participants.some(o => o.id === player.id) && player.id !== initiator.id) {
      participants[participants.length - 1] = player;
    }
  }
  return [initiator, ...participants];
}

function buildHiddenRoles(rng: RNG, warcallType: WarcallType, participants: Officer[]): Warcall["hiddenRoles"] {
  if (warcallType === "ASSASSINATION") {
    const assassin = rng.pick(participants);
    return [{ who: assassin.id, role: "ASSASSIN" }];
  }
  if (warcallType === "PURGE") {
    return participants.slice(1).map(o => ({ who: o.id, role: rng.chance(0.5) ? "LOYALIST" : "TRAITOR" }));
  }
  return [];
}

function baseRewards(type: WarcallType): { xp: number; merit: number; titles: string[] } {
  switch (type) {
    case "FEAST": return { xp: 10, merit: 8, titles: [] };
    case "OVERFALL": return { xp: 30, merit: 20, titles: [] };
    case "ASSASSINATION": return { xp: 35, merit: 28, titles: [] };
    case "HUNT": return { xp: 18, merit: 14, titles: [] };
    case "MONSTER_HUNT": return { xp: 45, merit: 30, titles: ["Bestienjäger"] };
    case "PURGE": return { xp: 50, merit: 35, titles: [] };
  }
}

function agendaWarcall(rng: RNG, state: WorldState, initiator: Officer): Warcall {
  const type = weightedTypeFromAgenda(initiator);
  const participants = pickParticipants(rng, state, initiator, type === "PURGE" ? 5 : 3, false);
  return {
    id: createWarcallId(state, rng),
    type,
    source: "AGENDA",
    initiator: initiator.id,
    participants: participants.map(o => o.id),
    hiddenRoles: buildHiddenRoles(rng, type, participants),
    location: rng.pick(LOCATIONS),
    startCycle: state.cycle,
    deadlineCycle: state.cycle + 1,
    rewards: baseRewards(type),
    state: "ANNOUNCED"
  };
}

function randomWarcall(rng: RNG, state: WorldState): Warcall {
  const alive = state.officers.filter(o => o.status === "ALIVE");
  const initiator = rng.pick(alive);
  const type = randomType(rng);
  const participants = pickParticipants(rng, state, initiator, 3, false);
  return {
    id: createWarcallId(state, rng),
    type,
    source: "RANDOM",
    initiator: initiator.id,
    participants: participants.map(o => o.id),
    hiddenRoles: buildHiddenRoles(rng, type, participants),
    location: rng.pick(LOCATIONS),
    startCycle: state.cycle,
    deadlineCycle: state.cycle + 1,
    rewards: baseRewards(type),
    state: "ANNOUNCED"
  };
}

function playerWarcall(rng: RNG, state: WorldState): Warcall | null {
  const player = state.officers.find(o => o.id === state.playerId && o.status === "ALIVE");
  if (!player) return null;
  const type: WarcallType = player.rank === "Grunzer" ? "HUNT" : "OVERFALL";
  const participants = pickParticipants(rng, state, player, 2, true);
  return {
    id: createWarcallId(state, rng),
    type,
    source: "PLAYER",
    initiator: player.id,
    participants: participants.map(o => o.id),
    hiddenRoles: buildHiddenRoles(rng, type, participants),
    location: rng.pick(LOCATIONS),
    startCycle: state.cycle,
    deadlineCycle: state.cycle + 1,
    rewards: baseRewards(type),
    state: "ANNOUNCED"
  };
}

/**
 * Plant neue Warcalls, damit 2-4 gleichzeitig aktiv sind.
 *
 * @example
 * const calls = planWarcalls(rng, state);
 */
export function planWarcalls(rng: RNG, state: WorldState): Warcall[] {
  const active = state.warcalls.filter(w => w.state !== "RESOLVED");
  const target = rng.int(WARCALL_ACTIVE_MIN, WARCALL_ACTIVE_MAX);
  const needed = Math.max(0, target - active.length);
  const created: Warcall[] = [];
  for (let i = 0; i < needed; i++) {
    const source = chooseSource(rng);
    const alive = state.officers.filter(o => o.status === "ALIVE");
    if (alive.length < 2) break;
    let warcall: Warcall | null = null;
    if (source === "AGENDA") {
      const weighted = [...alive].sort((a, b) => b.personality.ambition - a.personality.ambition);
      warcall = agendaWarcall(rng, state, weighted[0]);
    } else if (source === "RANDOM") {
      warcall = randomWarcall(rng, state);
    } else {
      warcall = playerWarcall(rng, state);
    }
    if (warcall) {
      created.push(warcall);
      state.warcalls.push(warcall);
    }
  }
  return created;
}

/**
 * Simuliert alle Warcalls, deren Deadline erreicht wurde.
 *
 * @example
 * const result = resolveDueWarcalls(rng, state, manager);
 */
export function resolveDueWarcalls(rng: RNG, state: WorldState, manager: OfficerManager): WarcallResolution[] {
  const resolutions: WarcallResolution[] = [];
  for (const warcall of state.warcalls) {
    if (warcall.state === "RESOLVED") continue;
    if (state.cycle < warcall.deadlineCycle) continue;
    warcall.state = "IN_PROGRESS";
    const resolution = resolveWarcallCombat(rng, warcall, state, manager);
    warcall.state = "RESOLVED";
    resolutions.push(resolution);
  }
  return resolutions;
}
