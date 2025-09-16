import { Officer, Trait } from "./types";
import { RNG } from "./rng";

const ORC_NAMES = ["Gorzug","Muzgash","Shagrin","Uglok","Snaga","Krakh","Nazgrok","Bogdur","Rukdug","Lugdash"];

export function makeOfficer(rng: RNG, id: string): Officer {
  const level = rng.int(1, 5);
  const traitList: Trait[] = ["Berserker","Taktiker","Feigling","UnsterblichGerücht","Tierbändiger"];
  const traits: Trait[] = [rng.pick(traitList)];
  return {
    id, name: `${rng.pick(ORC_NAMES)}`, level,
    merit: rng.int(0, 50), traits, gearScore: rng.int(1, 10),
    alive: true,
    personality: { aggression: Math.random(), ambition: Math.random(), loyalty: Math.random() },
    memory: []
  };
}