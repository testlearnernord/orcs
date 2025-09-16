const LOCS = ["Schlackengrube", "Schädelhügel", "Schwarzmoor", "Aschepass"];

export function spawnWarcalls(rng, state) {
  const types = ["FestmahlDiplomatie","Uberfall","Monsterjagd","Tierjagd","Attentat"];
  const n = 3 + (state.cycle % 3);
  const calls = [];
  for (let i = 0; i < n; i++) {
    const alive = state.officers.filter(o => o.alive).map(o => o.id);
    const p1 = alive[rng.int(0, alive.length - 1)];
    let p2 = p1;
    while (p2 === p1) p2 = alive[rng.int(0, alive.length - 1)];
    calls.push({ id: `wc_${state.cycle}_${i}`, type: types[rng.int(0, types.length - 1)], participants: [p1, p2], location: LOCS[rng.int(0, LOCS.length - 1)], scheduledAtCycle: state.cycle });
  }
  return calls;
}

export function resolveWarcalls(rng, state) {
  const events = [];
  for (const wc of state.warcalls) {
    if (wc.scheduledAtCycle !== state.cycle) continue;
    const [a, b] = wc.participants.map(id => state.officers.find(o => o.id === id));
    if (!a || !b || !a.alive || !b.alive) continue;
    const powerA = a.level + a.gearScore + a.merit * 0.1;
    const powerB = b.level + b.gearScore + b.merit * 0.1;
    const swing = (Math.random() - 0.5) * 2;
    switch (wc.type) {
      case "Uberfall": {
        const win = powerA + swing > powerB ? a : b;
        const lose = win === a ? b : a;
        lose.alive = Math.random() > 0.7 ? false : true;
        win.merit += 5;
        events.push({ kind: "Uberfall", text: `${win.name} überlistet ${lose.name} bei ${wc.location}` });
        break;
      }
      case "FestmahlDiplomatie": {
        a.merit += 2; b.merit += 2;
        events.push({ kind: "Festmahl", text: `${a.name} und ${b.name} schließen fragile Allianz bei ${wc.location}` });
        break;
      }
      case "Monsterjagd":
      case "Tierjagd": {
        const success = powerA + powerB + swing > 10;
        if (success) { a.merit += 3; b.merit += 3;
          events.push({ kind: wc.type, text: `${a.name} und ${b.name} kehren siegreich aus ${wc.location} zurück` });
        } else { events.push({ kind: wc.type, text: `Die Jagd in ${wc.location} endet chaotisch. Niemand beeindruckt.` }); }
        break;
      }
      case "Attentat": {
        const assassin = Math.random() > 0.5 ? a : b;
        const victim = assassin === a ? b : a;
        const deadly = assassin.level + swing > victim.level + 0.5;
        if (deadly) { victim.alive = false; assassin.merit += 7;
          events.push({ kind: "Attentat", text: `${assassin.name} meuchelt ${victim.name} im Schatten von ${wc.location}` }); }
        else { events.push({ kind: "Attentat", text: `${assassin.name} scheitert kläglich an ${victim.name}` }); }
        break;
      }
    }
  }
  return events;
}
