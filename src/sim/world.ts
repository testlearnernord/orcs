import { RNG } from "./rng";
import { WorldState, CycleSummary, CycleTrigger } from "./types";
import { createOfficer } from "./officer";
import { runCycle } from "./cycle";
import { TOTAL_ACTIVE_OFFICERS } from "./constants";

function initialOfficers(rng: RNG): WorldState["officers"] {
  const officers = Array.from({ length: TOTAL_ACTIVE_OFFICERS }, (_v, i) => {
    if (i === 0) return createOfficer(rng, { rank: "König", titles: ["König"], relationships: { friends: [], rivals: [], loyalToKing: true } });
    if (i === 1) return createOfficer(rng, { rank: "Grunzer", titles: [], relationships: { friends: [], rivals: [], loyalToKing: false } });
    return createOfficer(rng, {});
  });
  return officers;
}

/**
 * Welt-Container, der RNG und State kapselt.
 */
export class World {
  public state: WorldState;
  private readonly rng: RNG;

  /**
   * Erstellt eine neue Welt.
   *
   * @example
   * const world = new World({ seed: 123 });
   */
  constructor(opts: { seed: number }) {
    this.rng = new RNG(opts.seed);
    const officers = initialOfficers(this.rng);
    const kingId = officers[0].id;
    const playerId = officers[1].id;
    this.state = { cycle: 0, officers, warcalls: [], kingId, playerId, feed: [] };
  }

  /**
   * Simuliert das Ende eines Cycles.
   *
   * @example
   * const summary = world.runCycle();
   */
  runCycle(trigger: CycleTrigger = "DEBUG"): CycleSummary {
    return runCycle(this.rng, this.state, trigger);
  }
}
