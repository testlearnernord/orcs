import { WorldState } from "./types";
import { RNG } from "./rng";
import { spawnWarcalls, resolveWarcalls } from "./warcall";
import { makeOfficer } from "./officer";

export function ensureTwentyAlive(rng: RNG, state: WorldState) {
  const need = 20 - state.officers.filter(o => o.alive).length;
  for (let i = 0; i < need; i++) {
    const id = `orc_${Date.now()}_${i}_${Math.floor(rng.next()*9999)}`;
    state.officers.push(makeOfficer(rng, id));
  }
}

export function runCycle(rng: RNG, state: WorldState) {
  state.cycle += 1;
  const king = state.officers.find(o => o.id === state.kingId);
  if (king && king.alive) king.merit = Math.max(0, Math.floor(king.merit * 0.5));
  state.warcalls.push(...spawnWarcalls(rng, state));
  const events = resolveWarcalls(rng, state);
  ensureTwentyAlive(rng, state);
  return { events };
}