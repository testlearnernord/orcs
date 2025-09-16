import { runCycle } from "./cycle.js";
import { makeOfficer } from "./officer.js";

export class World {
  constructor({ seed }) {
    const officers = Array.from({ length: 20 }, (_v, i) => makeOfficer({ int:(a,b)=>Math.floor(Math.random()*(b-a+1))+a }, `orc_${i}`));
    const kingId = officers[0].id;
    officers[0].title = "König";
    const playerId = officers[1].id;
    this.state = { cycle: 0, officers, warcalls: [], kingId, playerId };
  }
  runCycle() { return runCycle(this.state); }
}
