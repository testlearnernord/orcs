import { RNG } from "./rng";
import { WorldState } from "./types";
import { makeOfficer } from "./officer";
import { runCycle } from "./cycle";

export class World {
  public state: WorldState;
  private rng: RNG;

  constructor(opts: { seed: number }) {
    this.rng = new RNG(opts.seed);
    const officers = Array.from({ length: 20 }, (_v, i) => makeOfficer(this.rng, `orc_${i}`));
    const kingId = officers[0].id;
    officers[0].title = "König";
    const playerId = officers[1].id;
    this.state = { cycle: 0, officers, warcalls: [], kingId, playerId };
  }

  runCycle() { return runCycle(this.rng, this.state); }
}