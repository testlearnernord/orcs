import { spawnWarcalls, resolveWarcalls } from "./warcall.js";
import { makeOfficer } from "./officer.js";

export function ensureTwentyAlive(state) {
  const need = 20 - state.officers.filter(o => o.alive).length;
  for (let i = 0; i < need; i++) {
    const id = `orc_${Date.now()}_${i}_${Math.floor(Math.random()*9999)}`;
    state.officers.push(makeOfficer({ int:(a,b)=>Math.floor(Math.random()*(b-a+1))+a }, id));
  }
}

export function runCycle(state) {
  state.cycle += 1;
  const king = state.officers.find(o => o.id === state.kingId);
  if (king && king.alive) king.merit = Math.max(0, Math.floor(king.merit * 0.5));
  state.warcalls.push(...spawnWarcalls(null, state));
  const events = resolveWarcalls(null, state);
  ensureTwentyAlive(state);
  return { events };
}
