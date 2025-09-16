const ORC_NAMES = ["Gorzug","Muzgash","Shagrin","Uglok","Snaga","Krakh","Nazgrok","Bogdur","Rukdug","Lugdash"];

export function makeOfficer(rng, id) {
  const level = rng.int(1, 5);
  const traitList = ["Berserker","Taktiker","Feigling","UnsterblichGerücht","Tierbändiger"];
  const traits = [traitList[rng.int(0, traitList.length - 1)]];
  return {
    id, name: `${ORC_NAMES[rng.int(0, ORC_NAMES.length - 1)]}`, level,
    merit: rng.int(0, 50), traits, gearScore: rng.int(1, 10),
    alive: true,
    personality: { aggression: Math.random(), ambition: Math.random(), loyalty: Math.random() },
    memory: []
  };
}
