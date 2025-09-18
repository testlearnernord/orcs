var B = Object.defineProperty;
var C = (i, e, t) =>
  e in i
    ? B(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t })
    : (i[e] = t);
var a = (i, e, t) => C(i, typeof e != 'symbol' ? e + '' : e, t);
(function () {
  const e = document.createElement('link').relList;
  if (e && e.supports && e.supports('modulepreload')) return;
  for (const o of document.querySelectorAll('link[rel="modulepreload"]')) n(o);
  new MutationObserver((o) => {
    for (const r of o)
      if (r.type === 'childList')
        for (const c of r.addedNodes)
          c.tagName === 'LINK' && c.rel === 'modulepreload' && n(c);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(o) {
    const r = {};
    return (
      o.integrity && (r.integrity = o.integrity),
      o.referrerPolicy && (r.referrerPolicy = o.referrerPolicy),
      o.crossOrigin === 'use-credentials'
        ? (r.credentials = 'include')
        : o.crossOrigin === 'anonymous'
          ? (r.credentials = 'omit')
          : (r.credentials = 'same-origin'),
      r
    );
  }
  function n(o) {
    if (o.ep) return;
    o.ep = !0;
    const r = t(o);
    fetch(o.href, r);
  }
})();
const A = { König: 1, Spieler: 1, Captain: 4, Späher: 4, Grunzer: 10 },
  M = {
    König: {},
    Spieler: { demoteBelow: 120, demoteTo: 'Captain' },
    Captain: {
      promoteAt: 150,
      promoteTo: 'Spieler',
      demoteBelow: 40,
      demoteTo: 'Späher'
    },
    Späher: {
      promoteAt: 90,
      promoteTo: 'Captain',
      demoteBelow: 20,
      demoteTo: 'Grunzer'
    },
    Grunzer: { promoteAt: 50, promoteTo: 'Späher' }
  },
  G = {
    Feigling: -0.4,
    Berserker: 0.45,
    Hinterhältig: 0.3,
    Trinkfest: 0.15,
    Tierjäger: 0.2,
    Intrigant: 0.25
  },
  z = { ALLY: 0.35, FRIEND: 0.2, RIVAL: -0.45, BLOOD_OATH: 0.5 },
  _ = 10,
  K = 5,
  y = {
    DEATH: 100,
    SPAWN: 80,
    PROMOTION: 70,
    WARCALL: 60,
    RELATIONSHIP: 50,
    GENERAL: 10
  };
function T(i, e, t) {
  return `${t}_${e}_${Math.floor(i.next() * 1e6)}`;
}
function E(i) {
  return [
    `Basis ${i.base.toFixed(2)}`,
    `Traits ${i.traits.toFixed(2)}`,
    `Beziehungen ${i.relationships.toFixed(2)}`,
    `Zufall ${i.random.toFixed(2)}`
  ].join(', ');
}
function W(i, e, t) {
  const n = [
      `${t.name} kippt beim Festmahl den Krug – Allianz besiegelt?`,
      `${t.name} streift den Schlackennebel ab und schließt sich der Horde an.`,
      `Im Schatten des Pilzwaldes hebt ${t.name} den Blutkrug – Willkommen in den Reihen.`,
      `${t.name} brüllt durch den Hof und verlangt nach Ruhm.`,
      `Zwischen Knochenfeuern schwört ${t.name} dem Kriegstrupp Treue.`
    ],
    o = i.pick(n);
  return {
    id: T(i, e, 'spawn'),
    cycle: e,
    text: o,
    tone: 'SPAWN',
    priority: y.SPAWN
  };
}
function U(i, e, t, n) {
  const o = [
      `${t.name} fällt ${n} – die Halle verstummt.`,
      `${t.name} sinkt in den Schatten, ${n} hallt nach.`,
      `Blutige Sippe: ${t.name} erliegt ${n}.`,
      `${t.name} zerbirst unter ${n}.`,
      `Ein dumpfer Schlag, ein letzter Blick – ${t.name} findet sein Ende (${n}).`
    ],
    r = i.pick(o);
  return {
    id: T(i, e, 'death'),
    cycle: e,
    text: r,
    tone: 'DEATH',
    priority: y.DEATH
  };
}
function V(i, e, t, n) {
  const o = [
    `${t.name} lässt den Trophäenkranz klirren – Aufstieg zum ${n}.`,
    `${t.name} erkämpft sich den Titel ${n} mitten im Jubel.`,
    `Ein neues Banner für ${t.name}: ${n}!`
  ];
  return {
    id: T(i, e, 'promotion'),
    cycle: e,
    text: i.pick(o),
    tone: 'PROMOTION',
    priority: y.PROMOTION
  };
}
function Z(i, e, t, n, o) {
  const r = [
      `${t.initiator} führt die Meute bei ${t.location} zum Sieg. (${E(o)})`,
      `Im Sturm auf ${t.location} triumphiert der Trupp. (${E(o)})`
    ],
    c = [
      `${t.location} verschlingt die Krieger – Warcall scheitert. (${E(o)})`,
      `Der Ruf nach Krieg verhallt in ${t.location}. (${E(o)})`
    ],
    s = n ? i.pick(r) : i.pick(c);
  return {
    id: T(i, e, 'warcall'),
    cycle: e,
    text: s,
    tone: 'WARCALL',
    priority: y.WARCALL
  };
}
function j(i, e, t, n, o) {
  const c = {
    ALLY: ['schmiedet', 'besiegelt', 'formt'],
    RIVAL: ['reizt', 'verhöhnt', 'verletzt'],
    BLOOD_OATH: ['ritzt', 'bindet', 'verschlingt'],
    FRIEND: ['lacht mit', 'rauft freundschaftlich mit', 'teilt den Humpen mit']
  }[o].map((s) => `${t.name} ${s} ${n.name}.`);
  return {
    id: T(i, e, 'relation'),
    cycle: e,
    text: i.pick(c),
    tone: 'RELATIONSHIP',
    priority: y.RELATIONSHIP
  };
}
function $(i, e, t) {
  return {
    id: T(i, e, 'general'),
    cycle: e,
    text: t,
    tone: 'GENERAL',
    priority: y.GENERAL
  };
}
const Y = [
    { seed: 'orc-001', file: 'orc-001.png' },
    { seed: 'orc-002', file: 'orc-002.png' },
    { seed: 'orc-003', file: 'orc-003.png' },
    { seed: 'orc-004', file: 'orc-004.png' },
    { seed: 'orc-005', file: 'orc-005.png' },
    { seed: 'orc-006', file: 'orc-006.png' },
    { seed: 'orc-007', file: 'orc-007.png' },
    { seed: 'orc-008', file: 'orc-008.png' },
    { seed: 'orc-009', file: 'orc-009.png' },
    { seed: 'orc-010', file: 'orc-010.png' },
    { seed: 'orc-011', file: 'orc-011.png' },
    { seed: 'orc-012', file: 'orc-012.png' },
    { seed: 'orc-013', file: 'orc-013.png' },
    { seed: 'orc-014', file: 'orc-014.png' },
    { seed: 'orc-015', file: 'orc-015.png' },
    { seed: 'orc-016', file: 'orc-016.png' },
    { seed: 'orc-017', file: 'orc-017.png' },
    { seed: 'orc-018', file: 'orc-018.png' },
    { seed: 'orc-019', file: 'orc-019.png' },
    { seed: 'orc-020', file: 'orc-020.png' },
    { seed: 'orc-021', file: 'orc-021.png' },
    { seed: 'orc-022', file: 'orc-022.png' },
    { seed: 'orc-023', file: 'orc-023.png' },
    { seed: 'orc-024', file: 'orc-024.png' },
    { seed: 'orc-025', file: 'orc-025.png' },
    { seed: 'orc-026', file: 'orc-026.png' },
    { seed: 'orc-027', file: 'orc-027.png' },
    { seed: 'orc-028', file: 'orc-028.png' },
    { seed: 'orc-029', file: 'orc-029.png' },
    { seed: 'orc-030', file: 'orc-030.png' },
    { seed: 'orc-031', file: 'orc-031.png' },
    { seed: 'orc-032', file: 'orc-032.png' },
    { seed: 'orc-033', file: 'orc-033.png' },
    { seed: 'orc-034', file: 'orc-034.png' },
    { seed: 'orc-035', file: 'orc-035.png' },
    { seed: 'orc-036', file: 'orc-036.png' },
    { seed: 'orc-037', file: 'orc-037.png' },
    { seed: 'orc-038', file: 'orc-038.png' },
    { seed: 'orc-039', file: 'orc-039.png' },
    { seed: 'orc-040', file: 'orc-040.png' },
    { seed: 'orc-041', file: 'orc-041.png' },
    { seed: 'orc-042', file: 'orc-042.png' },
    { seed: 'orc-043', file: 'orc-043.png' },
    { seed: 'orc-044', file: 'orc-044.png' },
    { seed: 'orc-045', file: 'orc-045.png' },
    { seed: 'orc-046', file: 'orc-046.png' },
    { seed: 'orc-047', file: 'orc-047.png' },
    { seed: 'orc-048', file: 'orc-048.png' },
    { seed: 'orc-049', file: 'orc-049.png' },
    { seed: 'orc-050', file: 'orc-050.png' },
    { seed: 'orc-051', file: 'orc-051.png' },
    { seed: 'orc-052', file: 'orc-052.png' },
    { seed: 'orc-053', file: 'orc-053.png' },
    { seed: 'orc-054', file: 'orc-054.png' },
    { seed: 'orc-055', file: 'orc-055.png' },
    { seed: 'orc-056', file: 'orc-056.png' },
    { seed: 'orc-057', file: 'orc-057.png' },
    { seed: 'orc-058', file: 'orc-058.png' },
    { seed: 'orc-059', file: 'orc-059.png' },
    { seed: 'orc-060', file: 'orc-060.png' },
    { seed: 'orc-061', file: 'orc-061.png' },
    { seed: 'orc-062', file: 'orc-062.png' },
    { seed: 'orc-063', file: 'orc-063.png' },
    { seed: 'orc-064', file: 'orc-064.png' },
    { seed: 'orc-065', file: 'orc-065.png' },
    { seed: 'orc-066', file: 'orc-066.png' },
    { seed: 'orc-067', file: 'orc-067.png' },
    { seed: 'orc-068', file: 'orc-068.png' },
    { seed: 'orc-069', file: 'orc-069.png' },
    { seed: 'orc-070', file: 'orc-070.png' },
    { seed: 'orc-071', file: 'orc-071.png' },
    { seed: 'orc-072', file: 'orc-072.png' },
    { seed: 'orc-073', file: 'orc-073.png' },
    { seed: 'orc-074', file: 'orc-074.png' },
    { seed: 'orc-075', file: 'orc-075.png' },
    { seed: 'orc-076', file: 'orc-076.png' },
    { seed: 'orc-077', file: 'orc-077.png' },
    { seed: 'orc-078', file: 'orc-078.png' },
    { seed: 'orc-079', file: 'orc-079.png' },
    { seed: 'orc-080', file: 'orc-080.png' }
  ],
  x = Y;
function q(i) {
  let e = 0;
  for (let t = 0; t < i.length; t += 1)
    ((e = (e << 5) - e + i.charCodeAt(t)), (e |= 0));
  return e >>> 0;
}
function J(i) {
  if (x.length === 0) return 'default';
  const e = q(i) % x.length;
  return x[e].seed;
}
const Q = [
    'Bog',
    'Gor',
    'Lug',
    'Maz',
    'Naz',
    'Or',
    'Ruk',
    'Shag',
    'Urz',
    'Zog'
  ],
  X = ['dak', 'gash', 'muk', 'nak', 'rag', 'ruk', 'snak', 'thor', 'zug', 'zul'],
  ee = { König: 220, Spieler: 160, Captain: 120, Späher: 80, Grunzer: 40 },
  te = {
    König: [12, 14],
    Spieler: [10, 12],
    Captain: [6, 10],
    Späher: [4, 7],
    Grunzer: [2, 5]
  };
function ie(i) {
  return `${i.pick(Q)}${i.pick(X)}`;
}
function ne(i) {
  const e = [
      'Feigling',
      'Berserker',
      'Hinterhältig',
      'Trinkfest',
      'Tierjäger',
      'Intrigant'
    ],
    t = i.chance(0.3) ? 2 : 1;
  return i.shuffle(e).slice(0, t);
}
function oe(i) {
  return {
    gier: i.next(),
    tapferkeit: i.next(),
    loyalitaet: i.next(),
    stolz: i.next()
  };
}
function m(i, e, t = 16) {
  const n = [...i.memories, e];
  return (n.length > t && n.splice(0, n.length - t), { ...i, memories: n });
}
function v(i, e, t, n = {}) {
  const [o, r] = te[e],
    c = i.int(o, r),
    s = Math.max(10, Math.round(ee[e] + i.int(-15, 15))),
    l = n.id ?? `orc_${t}_${i.int(100, 999999)}`,
    f = n.portraitSeed ?? J(l);
  return {
    id: l,
    name: n.name ?? ie(i),
    rank: e,
    level: n.level ?? c,
    merit: n.merit ?? s,
    traits: n.traits ?? ne(i),
    personality: n.personality ?? oe(i),
    relationships: n.relationships ?? [],
    portraitSeed: f,
    status: n.status ?? 'ALIVE',
    cycleJoined: n.cycleJoined ?? t,
    cycleDied: n.cycleDied,
    memories: n.memories ?? []
  };
}
function R(i, e) {
  const t = i.relationships.filter((n) => n.with !== e.with);
  return { ...i, relationships: [...t, e] };
}
function O(i, e) {
  return i.officers.find((t) => t.id === e);
}
function L(i, e) {
  i.officers = i.officers.map((t) => (t.id === e.id ? e : t));
}
function F(i, e, t, n, o, r) {
  if (e === t) return;
  const c = O(i, e),
    s = O(i, t);
  if (!c || !s) return;
  const l = n === 'BLOOD_OATH' ? o + _ : void 0,
    f = { with: s.id, type: n, sinceCycle: o, expiresAtCycle: l },
    h = { with: c.id, type: n, sinceCycle: o, expiresAtCycle: l };
  let d = R(c, f),
    u = R(s, h);
  return (
    (d = m(d, {
      cycle: o,
      category: n === 'BLOOD_OATH' ? 'BLOOD_OATH' : 'RELATIONSHIP',
      summary: `${n} mit ${u.name}`
    })),
    (u = m(u, {
      cycle: o,
      category: n === 'BLOOD_OATH' ? 'BLOOD_OATH' : 'RELATIONSHIP',
      summary: `${n} mit ${d.name}`
    })),
    L(i, d),
    L(i, u),
    j(r, o, d, u, n)
  );
}
function N(i, e, t) {
  const n = [],
    o = i.officers.filter((c) => c.id !== e.id);
  if (o.length === 0) return n;
  const r = t.chance(0.4) ? 2 : 1;
  for (let c = 0; c < r; c += 1) {
    const s = t.pick(o),
      l = t.next();
    let f;
    if (
      (l < 0.05
        ? (f = 'BLOOD_OATH')
        : l < 0.2
          ? (f = 'RIVAL')
          : l < 0.5
            ? (f = 'ALLY')
            : l < 0.7 && (f = 'FRIEND'),
      !f)
    )
      continue;
    const h = F(i, e.id, s.id, f, i.cycle, t);
    h && n.push(h);
  }
  return n;
}
function re(i, e, t) {
  const n = [],
    o = new Set();
  for (const r of i.officers)
    for (const c of r.relationships) {
      if (
        c.type !== 'BLOOD_OATH' ||
        c.expiresAtCycle === void 0 ||
        c.expiresAtCycle > e
      )
        continue;
      const s = [r.id, c.with].sort().join(':');
      if (o.has(s)) continue;
      o.add(s);
      const l = O(i, c.with);
      if (!l) continue;
      const f = (r.personality.loyalitaet + l.personality.loyalitaet) / 2,
        h = (r.personality.stolz + l.personality.stolz) / 2,
        d = (r.personality.gier + l.personality.gier) / 2;
      let u = 'ALLY';
      d > f && h > f && (u = 'RIVAL');
      const p = F(i, r.id, l.id, u, e, t);
      p && n.push(p);
    }
  return n;
}
function se(i, e, t) {
  const n = new Set(),
    o = [...e];
  for (; o.length > 0; ) {
    const r = o.pop();
    if (!r) continue;
    const c = O(i, r);
    if (c)
      for (const s of c.relationships)
        s.type === 'BLOOD_OATH' &&
          ((s.expiresAtCycle !== void 0 && s.expiresAtCycle <= t) ||
            e.has(s.with) ||
            n.has(s.with) ||
            (n.add(s.with), o.push(s.with)));
  }
  return n;
}
function ce(i, e) {
  let t = 0;
  for (const n of i.relationships) {
    if (!e.find((c) => c.id === n.with)) continue;
    const r = z[n.type];
    typeof r == 'number' && (t += r);
  }
  return t;
}
const le = [
  'Schädelhügel',
  'Schlackengrube',
  'Pilzwald',
  'Aschepass',
  'Knochenarena',
  'Teersümpfe'
];
function D(i) {
  return 1 / (1 + Math.exp(-i));
}
function fe(i, e) {
  const t = [];
  for (const n of e.participants) {
    const o = i.officers.find((r) => r.id === n);
    o && t.push(o);
  }
  return t;
}
function ae(i, e, t, n) {
  let o = 0.5 - e.baseDifficulty;
  n === 'UNGEFESTIGT' && (o -= 0.2);
  const r = t.reduce((d, u) => {
      const p = u.traits.reduce((k, P) => k + (G[P] ?? 0), 0);
      return d + p;
    }, 0),
    c = t.reduce((d, u) => d + ce(u, t), 0),
    s = r / Math.max(t.length, 1),
    l = c / Math.max(t.length, 1),
    f = i.fork(`warcall:${e.id}`).next() - 0.5,
    h = o + s + l + f;
  return { base: o, traits: s, relationships: l, random: f, logistic: h };
}
function de(i, e, t, n) {
  return e.length === 0
    ? []
    : t
      ? []
      : n === 'UNGEFESTIGT' && e.length > 1
        ? i
            .shuffle(e)
            .slice(0, 2)
            .map((c) => c.id)
        : [i.pick(e).id];
}
function ue(i, e, t) {
  let n = e ? 20 : Math.max(-10, -i.merit * 0.1);
  return (
    e && t === 'UNGEFESTIGT' && (n /= 2),
    { ...i, merit: Math.max(0, i.merit + n) }
  );
}
function he(i, e, t) {
  const n = fe(i, t),
    o = ae(e, t, n, i.kingStatus),
    r = D(o.logistic),
    c = e.fork(`resolve:${t.id}`).next() <= r;
  t.breakdown = o;
  const s = de(e.fork(`casualties:${t.id}`), n, c, i.kingStatus),
    l = Z(e, i.cycle, t, c, o);
  for (const f of n) {
    const h = m(ue(f, c, i.kingStatus), {
      cycle: i.cycle,
      category: 'WARCALL',
      summary: `${c ? 'Triumph' : 'Schmach'} bei ${t.location}`,
      details: `Chance ${(r * 100).toFixed(1)}%`
    });
    i.officers = i.officers.map((d) => (d.id === h.id ? h : d));
  }
  return { warcall: t, success: c, casualties: s, feed: [l] };
}
function pe(i, e, t) {
  const n = e.filter((c) => c.status === 'ALIVE' && c.rank !== 'König'),
    o = [],
    r = i.shuffle(n);
  for (let c = 0; c < Math.min(t, r.length); c += 1) o.push(r[c]);
  return o;
}
function ge(i, e, t) {
  const n = pe(e, i.officers, 3);
  if (n.length === 0) return;
  const o = e.pick(n);
  return {
    id: `warcall_${t}_${e.int(100, 999999)}`,
    cycleAnnounced: t,
    resolveOn: t + 1,
    initiator: o.id,
    participants: n.map((r) => r.id),
    location: e.pick(le),
    baseDifficulty: e.next()
  };
}
function me(i, e) {
  const t = i.warcalls.filter((r) => r.resolveOn <= i.cycle),
    n = i.warcalls.filter((r) => r.resolveOn > i.cycle),
    o = t.map((r) => he(i, e, r));
  return ((i.warcalls = n), o);
}
function ye(i, e) {
  i.warcalls = [...i.warcalls, ...e];
}
function Te(i) {
  const e = i.warcall.breakdown;
  return e
    ? `Chance ${(D(e.logistic) * 100).toFixed(1)}%
Basis: ${e.base.toFixed(2)}
Traits: ${e.traits.toFixed(2)}
Beziehungen: ${e.relationships.toFixed(2)}
Zufall: ${e.random.toFixed(2)}`
    : 'Keine Daten';
}
function b(i) {
  const e = { König: 0, Spieler: 0, Captain: 0, Späher: 0, Grunzer: 0 };
  return (
    i.forEach((t) => {
      e[t.rank] += 1;
    }),
    e
  );
}
function Ae(i, e) {
  return i.map((t) => ({
    ...t,
    relationships: t.relationships.filter((n) => !e.has(n.with))
  }));
}
function Se(i, e, t) {
  const n = [],
    o = [];
  if (e.size === 0) return { feed: n, deadIds: o };
  i.officers = Ae(i.officers, e);
  for (const r of e) {
    const c = i.officers.find((l) => l.id === r);
    if (!c) continue;
    const s = m(
      { ...c, status: 'DEAD', cycleDied: i.cycle },
      {
        cycle: i.cycle,
        category: 'DEATH',
        summary: `Gefallen in Zyklus ${i.cycle}`
      }
    );
    (n.push(U(t, i.cycle, s, 'im Blutrausch')),
      o.push(s.id),
      (i.graveyard = [{ ...s }, ...i.graveyard]),
      (i.officers = i.officers.filter((l) => l.id !== r)));
  }
  return { feed: n, deadIds: o };
}
function Ee(i, e, t) {
  if (i.officers.find((s) => s.id === i.kingId) || i.officers.length === 0)
    return;
  const r = {
    ...[...i.officers].sort((s, l) => l.merit - s.merit)[0],
    rank: 'König'
  };
  ((i.kingId = r.id),
    (i.kingStatus = 'UNGEFESTIGT'),
    (i.kingStatusExpires = i.cycle + K),
    (i.officers = i.officers.map((s) => (s.id === r.id ? r : s))),
    t.push($(e, i.cycle, `${r.name} besteigt als UNGEFESTIGT den Thron.`)));
  const c = m(r, {
    cycle: i.cycle,
    category: 'PROMOTION',
    summary: 'Zum König erhoben'
  });
  i.officers = i.officers.map((s) => (s.id === c.id ? c : s));
}
function Oe(i, e, t) {
  const n = [],
    o = [],
    r = b(i.officers);
  return (
    Object.keys(A).forEach((c) => {
      const s = A[c];
      for (; r[c] + o.filter((l) => l.rank === c).length < s; ) {
        let l = v(e, c, t);
        ((l = m(l, {
          cycle: t,
          category: 'SPAWN',
          summary: 'Neu in der Horde'
        })),
          i.officers.push(l),
          o.push(l),
          n.push(W(e, t, l)));
        const f = N(i, l, e);
        n.push(...f);
      }
    }),
    { spawns: o, feed: n }
  );
}
function we(i, e) {
  const t = [],
    n = [],
    o = b(i.officers),
    r = [...i.officers].sort((c, s) => s.merit - c.merit);
  for (const c of r) {
    const s = M[c.rank];
    if (
      s.promoteAt !== void 0 &&
      s.promoteTo &&
      c.merit >= s.promoteAt &&
      o[s.promoteTo] < A[s.promoteTo]
    ) {
      ((o[c.rank] -= 1), (o[s.promoteTo] += 1));
      const l = m(
        { ...c, rank: s.promoteTo },
        {
          cycle: i.cycle,
          category: 'PROMOTION',
          summary: `Aufstieg zu ${s.promoteTo}`
        }
      );
      ((i.officers = i.officers.map((f) => (f.id === l.id ? l : f))),
        n.push({ officerId: c.id, from: c.rank, to: s.promoteTo }),
        t.push(V(e, i.cycle, l, s.promoteTo)));
      continue;
    }
    if (s.demoteBelow !== void 0 && s.demoteTo && c.merit < s.demoteBelow) {
      ((o[c.rank] -= 1), (o[s.demoteTo] += 1));
      const l = m(
        { ...c, rank: s.demoteTo },
        {
          cycle: i.cycle,
          category: 'PROMOTION',
          summary: `Abstieg zu ${s.demoteTo}`
        }
      );
      ((i.officers = i.officers.map((f) => (f.id === l.id ? l : f))),
        n.push({ officerId: c.id, from: c.rank, to: s.demoteTo }),
        t.push(
          $(e, i.cycle, `${l.name} wird zum ${s.demoteTo} zurückgestuft.`)
        ));
    }
  }
  return { promotions: n, feed: t };
}
function ke(i, e, t) {
  i.kingStatus === 'UNGEFESTIGT' &&
    i.cycle >= i.kingStatusExpires &&
    ((i.kingStatus = 'GEFESTIGT'),
    t.push($(e, i.cycle, 'Der König gilt wieder als GEFESTIGT.')));
}
function xe(i, e) {
  const t = [],
    n = 1 + (i.cycle % 2);
  for (let o = 0; o < n; o += 1) {
    const r = ge(i, e, i.cycle);
    r && t.push(r);
  }
  return (ye(i, t), t);
}
function $e(i) {
  return [...i].sort((e, t) =>
    e.priority === t.priority
      ? e.id.localeCompare(t.id)
      : t.priority - e.priority
  );
}
function Ie(i, e) {
  i.cycle += 1;
  const t = [];
  ke(i, e, t);
  const n = re(i, i.cycle, e);
  t.push(...n);
  const o = me(i, e);
  o.forEach((p) => {
    t.push(...p.feed);
  });
  const r = new Set();
  (o.forEach((p) => p.casualties.forEach((k) => r.add(k))),
    se(i, r, i.cycle).forEach((p) => r.add(p)));
  const s = Se(i, r, e);
  (t.push(...s.feed), Ee(i, e, t));
  const { spawns: l, feed: f } = Oe(i, e, i.cycle);
  t.push(...f);
  const h = xe(i, e),
    d = we(i, e);
  t.push(...d.feed);
  const u = $e(t);
  return (
    (i.feed = [...i.feed, ...u].slice(-120)),
    {
      cycle: i.cycle,
      warcallsResolved: o,
      warcallsPlanned: h,
      deaths: s.deadIds,
      spawns: l,
      promotions: d.promotions,
      feed: u
    }
  );
}
class w {
  constructor(e) {
    a(this, 'state');
    let t = 0;
    const n = typeof e == 'number' ? e.toString() : e;
    for (let o = 0; o < n.length; o += 1)
      ((t = (t << 5) - t + n.charCodeAt(o)), (t |= 0));
    this.state = t || 1831565813;
  }
  next() {
    let e = this.state;
    return (
      (e ^= e << 13),
      (e ^= e >>> 17),
      (e ^= e << 5),
      (this.state = e),
      (e >>> 0) / 4294967296
    );
  }
  int(e, t) {
    return Math.floor(this.next() * (t - e + 1)) + e;
  }
  pick(e) {
    if (e.length === 0) throw new Error('Cannot pick from empty array');
    return e[Math.floor(this.next() * e.length)];
  }
  shuffle(e) {
    const t = [...e];
    for (let n = t.length - 1; n > 0; n -= 1) {
      const o = Math.floor(this.next() * (n + 1));
      [t[n], t[o]] = [t[o], t[n]];
    }
    return t;
  }
  chance(e) {
    return this.next() < e;
  }
  fork(e) {
    return new w(`${e}:${this.state}`);
  }
}
function Re(i, e = new w(i)) {
  const t = {
    seed: i,
    cycle: 0,
    officers: [],
    graveyard: [],
    warcalls: [],
    kingId: '',
    kingStatus: 'GEFESTIGT',
    kingStatusExpires: 0,
    feed: []
  };
  Object.keys(A).forEach((o) => {
    const r = A[o];
    for (let c = 0; c < r; c += 1) {
      let s = v(e, o, t.cycle);
      ((s = m(s, {
        cycle: 0,
        category: 'SPAWN',
        summary: 'Teil des Ausgangszugs'
      })),
        t.officers.push(s),
        N(t, s, e));
    }
  });
  const n = t.officers.find((o) => o.rank === 'König');
  return (
    n
      ? (t.kingId = n.id)
      : t.officers.length > 0 &&
        ((t.kingId = t.officers[0].id),
        (t.officers[0] = { ...t.officers[0], rank: 'König' })),
    t
  );
}
class Le {
  constructor() {
    a(this, 'listeners', new Map());
  }
  on(e, t) {
    const n = this.listeners.get(e) ?? new Set();
    return (n.add(t), this.listeners.set(e, n), () => this.off(e, t));
  }
  off(e, t) {
    const n = this.listeners.get(e);
    n && (n.delete(t), n.size === 0 && this.listeners.delete(e));
  }
  emit(e, t) {
    const n = this.listeners.get(e);
    n &&
      n.forEach((o) => {
        o(t);
      });
  }
}
class He {
  constructor(e) {
    a(this, 'events', new Le());
    a(this, 'rng');
    a(this, 'state');
    ((this.rng = new w(e)), (this.state = Re(e, this.rng)));
  }
  getState() {
    return this.state;
  }
  tick() {
    const e = Ie(this.state, this.rng);
    return (
      this.events.emit('cycle:completed', e),
      e.feed.length > 0 && this.events.emit('feed:appended', e.feed),
      this.events.emit('graveyard:changed', this.state.graveyard),
      this.events.emit('state:changed', this.state),
      e
    );
  }
}
const g = {
  MODAL: 900,
  TOOLTIP: 800,
  FEED: 700,
  HERRSCHAFT: 400,
  CAPTAINS: 300,
  SPAEHER: 200,
  GRUNZER: 100
};
class ve {
  constructor(e, t, n) {
    ((this.x = e), (this.y = t), (this.radius = n));
  }
  contains(e) {
    const t = e.x - this.x,
      n = e.y - this.y;
    return t * t + n * n <= this.radius * this.radius;
  }
}
class S {
  constructor(e = { x: 0, y: 0 }) {
    a(this, 'children', []);
    a(this, 'depth', 0);
    a(this, 'scrollFactor', 1);
    a(this, 'hitArea');
    a(this, 'visible', !0);
    this.position = e;
  }
  add(e) {
    this.children.push(e);
  }
  setDepth(e) {
    return ((this.depth = e), this);
  }
  setScrollFactor(e) {
    return ((this.scrollFactor = e), this);
  }
  setCircleHitArea(e) {
    return ((this.hitArea = new ve(this.position.x, this.position.y, e)), this);
  }
  hitTest(e) {
    return this.hitArea ? this.hitArea.contains(e) : !1;
  }
}
function Fe(i, e) {
  const t = [];
  let n = i;
  for (; n.length > e; ) (t.push(n.slice(0, e)), (n = n.slice(e)));
  return (n.length > 0 && t.push(n), t);
}
function Ne(i, e) {
  const t = i.split(/\s+/),
    n = [];
  let o = '';
  for (const r of t) {
    const c = r.length > e ? Fe(r, e) : [r];
    for (const s of c) {
      if (o.length === 0) {
        o = s;
        continue;
      }
      (o + ' ' + s).length <= e ? (o = `${o} ${s}`) : (n.push(o), (o = s));
    }
  }
  return (o.length > 0 && n.push(o), n);
}
class De extends S {
  constructor(t = 420, n = 18, o = 6) {
    super({ x: 0, y: 0 });
    a(this, 'width');
    a(this, 'lineHeight');
    a(this, 'lineSpacing');
    a(this, 'layout', []);
    ((this.width = t),
      (this.lineHeight = n),
      (this.lineSpacing = o),
      this.setDepth(g.FEED));
  }
  render(t) {
    const n = [],
      o = Math.max(10, Math.floor(this.width / 8));
    let r = 0;
    return (
      t.forEach((c) => {
        const s = Ne(c.text, o);
        (s.forEach((l, f) => {
          (n.push({ text: l, y: r }),
            f < s.length - 1 && (r += this.lineHeight + this.lineSpacing));
        }),
          (r += this.lineHeight + this.lineSpacing));
      }),
      (this.layout = n),
      n
    );
  }
  getLines() {
    return this.layout;
  }
}
class H extends S {
  constructor(t, n = {}) {
    super({ x: 0, y: 0 });
    a(this, 'entries');
    a(this, 'rowHeight');
    a(this, 'viewHeight');
    a(this, 'offset', 0);
    a(this, 'isOpen', !0);
    ((this.entries = t.map((o) => ({
      id: o.id,
      name: o.name,
      cycle: o.cycleDied ?? 0
    }))),
      (this.rowHeight = n.rowHeight ?? 36),
      (this.viewHeight = n.viewHeight ?? 180),
      this.setDepth(g.MODAL));
  }
  get scrollOffset() {
    return this.offset;
  }
  get maxScroll() {
    return Math.max(0, this.entries.length * this.rowHeight - this.viewHeight);
  }
  scroll(t) {
    this.offset = Math.min(this.maxScroll, Math.max(0, this.offset + t));
  }
  onWheel(t) {
    this.scroll(t);
  }
  close() {
    this.isOpen = !1;
  }
  listVisible() {
    const t = Math.floor(this.offset / this.rowHeight),
      n = Math.ceil(this.viewHeight / this.rowHeight);
    return this.entries.slice(t, t + n);
  }
}
const be = [
  { key: 'E', label: 'Cycle', scrollFactor: 0, visible: !0 },
  { key: 'R', label: 'Neu', scrollFactor: 0, visible: !0 },
  { key: 'SPACE', label: 'Skip', scrollFactor: 0, visible: !0 }
];
class Pe extends S {
  constructor() {
    super({ x: 0, y: 0 });
    a(this, 'buttons');
    ((this.buttons = be.map((t) => ({ ...t }))),
      this.setDepth(g.FEED + 10).setScrollFactor(0));
  }
  toggle(t, n) {
    const o = this.buttons.find((r) => r.key === t);
    o && (o.visible = n);
  }
}
const Be = {
  König: g.HERRSCHAFT,
  Spieler: g.HERRSCHAFT,
  Captain: g.CAPTAINS,
  Späher: g.SPAEHER,
  Grunzer: g.GRUNZER
};
class Ce extends S {
  constructor(t, n = 48) {
    super({ x: 0, y: 0 });
    a(this, 'officer');
    a(this, 'badges');
    ((this.officer = t),
      (this.badges = t.traits),
      this.setCircleHitArea(n),
      this.setDepth(Be[t.rank]));
  }
  isPointInside(t, n) {
    return this.hitTest({ x: t, y: n });
  }
}
class Me extends S {
  constructor() {
    super({ x: 0, y: 0 });
    a(this, 'text', '');
    this.setDepth(g.TOOLTIP).setScrollFactor(0);
  }
  show(t) {
    ((this.text = Te(t)), (this.visible = !0));
  }
  hide() {
    this.visible = !1;
  }
}
class Ge {
  constructor(e) {
    a(this, 'feed', new De());
    a(this, 'tooltip', new Me());
    a(this, 'hotkeys', new Pe());
    a(this, 'graveyard', null);
    a(this, 'tokens', new Map());
    ((this.store = e),
      this.syncOfficers(e.getState().officers),
      (this.graveyard = new H(e.getState().graveyard)),
      e.events.on('feed:appended', (t) => {
        this.feed.render(t);
      }),
      e.events.on('graveyard:changed', (t) => {
        this.graveyard = new H(t);
      }),
      e.events.on('state:changed', (t) => {
        this.syncOfficers(t.officers);
      }),
      e.events.on('cycle:completed', (t) => {
        const n = t.warcallsResolved.at(-1);
        n && this.showWarcall(n);
      }));
  }
  syncOfficers(e) {
    (this.tokens.clear(),
      e.forEach((t) => {
        this.tokens.set(t.id, new Ce(t));
      }));
  }
  getToken(e) {
    return this.tokens.get(e);
  }
  showWarcall(e) {
    this.tooltip.show(e);
  }
  hideTooltip() {
    this.tooltip.hide();
  }
}
const I = new He('nemesis-seed'),
  ze = new Ge(I);
function _e() {
  I.tick();
}
typeof window < 'u' &&
  (window.nemesis = { store: I, ui: ze, advanceCycle: _e });
