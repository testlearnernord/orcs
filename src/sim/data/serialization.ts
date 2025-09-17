import { TOTAL_ACTIVE_OFFICERS } from "../constants";
import { RNG } from "../rng";
import { WorldState } from "../types";

// TODO: JSON-Schema-Validierung hinterlegen, sobald wir ein Validierungs-Framework anbinden.

interface SerializedWorld {
  version: number;
  state: WorldState;
}

/**
 * Serialisiert den aktuellen Welt-Status in eine JSON-Zeichenkette.
 *
 * @example
 * const json = serializeWorldState(world.state);
 */
export function serializeWorldState(state: WorldState): string {
  const payload: SerializedWorld = { version: 1, state };
  return JSON.stringify(payload);
}

/**
 * Stellt eine Welt aus einem JSON-String wieder her. Wir validieren die wichtigsten
 * Invarianten (z. B. 20 aktive Offiziere) und erzeugen einen RNG auf Basis des Seeds.
 *
 * @example
 * const { state } = deserializeWorldState(json);
 */
export function deserializeWorldState(json: string): { state: WorldState; rng: RNG } {
  const payload = JSON.parse(json) as SerializedWorld;
  if (!payload || typeof payload !== "object" || payload.version !== 1) {
    throw new Error("Unsupported save data");
  }
  const alive = payload.state.officers.filter(o => o.status === "ALIVE");
  if (alive.length > TOTAL_ACTIVE_OFFICERS) {
    throw new Error("Invalid save: too many active officers");
  }
  const rngSeed = payload.state.cycle + alive.length * 97;
  return { state: payload.state, rng: new RNG(rngSeed) };
}
