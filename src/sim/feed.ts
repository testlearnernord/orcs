import { FEED_PRIORITIES } from '@sim/constants';
import { RNG } from '@sim/rng';
import type {
  FeedEntry,
  Officer,
  WarcallBreakdown,
  WarcallPlan
} from '@sim/types';

function entryId(rng: RNG, cycle: number, label: string): string {
  return `${label}_${cycle}_${Math.floor(rng.next() * 1_000_000)}`;
}

function formatBreakdown(breakdown: WarcallBreakdown): string {
  const parts = [
    `Basis ${breakdown.base.toFixed(2)}`,
    `Traits ${breakdown.traits.toFixed(2)}`,
    `Beziehungen ${breakdown.relationships.toFixed(2)}`,
    `Zufall ${breakdown.random.toFixed(2)}`
  ];
  return parts.join(', ');
}

export function createSpawnEntry(
  rng: RNG,
  cycle: number,
  officer: Officer
): FeedEntry {
  const templates = [
    `${officer.name} kippt beim Festmahl den Krug – Allianz besiegelt?`,
    `${officer.name} streift den Schlackennebel ab und schließt sich der Horde an.`,
    `Im Schatten des Pilzwaldes hebt ${officer.name} den Blutkrug – Willkommen in den Reihen.`,
    `${officer.name} brüllt durch den Hof und verlangt nach Ruhm.`,
    `Zwischen Knochenfeuern schwört ${officer.name} dem Kriegstrupp Treue.`
  ];
  const text = rng.pick(templates);
  return {
    id: entryId(rng, cycle, 'spawn'),
    cycle,
    text,
    tone: 'SPAWN',
    priority: FEED_PRIORITIES.SPAWN
  };
}

export function createDeathEntry(
  rng: RNG,
  cycle: number,
  officer: Officer,
  cause: string
): FeedEntry {
  const templates = [
    `${officer.name} fällt ${cause} – die Halle verstummt.`,
    `${officer.name} sinkt in den Schatten, ${cause} hallt nach.`,
    `Blutige Sippe: ${officer.name} erliegt ${cause}.`,
    `${officer.name} zerbirst unter ${cause}.`,
    `Ein dumpfer Schlag, ein letzter Blick – ${officer.name} findet sein Ende (${cause}).`
  ];
  const text = rng.pick(templates);
  return {
    id: entryId(rng, cycle, 'death'),
    cycle,
    text,
    tone: 'DEATH',
    priority: FEED_PRIORITIES.DEATH
  };
}

export function createPromotionEntry(
  rng: RNG,
  cycle: number,
  officer: Officer,
  to: string
): FeedEntry {
  const templates = [
    `${officer.name} lässt den Trophäenkranz klirren – Aufstieg zum ${to}.`,
    `${officer.name} erkämpft sich den Titel ${to} mitten im Jubel.`,
    `Ein neues Banner für ${officer.name}: ${to}!`
  ];
  return {
    id: entryId(rng, cycle, 'promotion'),
    cycle,
    text: rng.pick(templates),
    tone: 'PROMOTION',
    priority: FEED_PRIORITIES.PROMOTION
  };
}

export function createWarcallEntry(
  rng: RNG,
  cycle: number,
  warcall: WarcallPlan,
  success: boolean,
  breakdown: WarcallBreakdown
): FeedEntry {
  const templatesSuccess = [
    `${warcall.initiator} führt die Meute bei ${warcall.location} zum Sieg. (${formatBreakdown(breakdown)})`,
    `Im Sturm auf ${warcall.location} triumphiert der Trupp. (${formatBreakdown(breakdown)})`
  ];
  const templatesFailure = [
    `${warcall.location} verschlingt die Krieger – Warcall scheitert. (${formatBreakdown(breakdown)})`,
    `Der Ruf nach Krieg verhallt in ${warcall.location}. (${formatBreakdown(breakdown)})`
  ];
  const text = success
    ? rng.pick(templatesSuccess)
    : rng.pick(templatesFailure);
  return {
    id: entryId(rng, cycle, 'warcall'),
    cycle,
    text,
    tone: 'WARCALL',
    priority: FEED_PRIORITIES.WARCALL
  };
}

export function createRelationshipEntry(
  rng: RNG,
  cycle: number,
  actor: Officer,
  target: Officer,
  type: 'ALLY' | 'RIVAL' | 'BLOOD_OATH' | 'FRIEND'
): FeedEntry {
  const verbs: Record<'ALLY' | 'RIVAL' | 'BLOOD_OATH' | 'FRIEND', string[]> = {
    ALLY: ['schmiedet', 'besiegelt', 'formt'],
    RIVAL: ['reizt', 'verhöhnt', 'verletzt'],
    BLOOD_OATH: ['ritzt', 'bindet', 'verschlingt'],
    FRIEND: ['lacht mit', 'rauft freundschaftlich mit', 'teilt den Humpen mit']
  };
  const templates = verbs[type].map(
    (verb) => `${actor.name} ${verb} ${target.name}.`
  );
  return {
    id: entryId(rng, cycle, 'relation'),
    cycle,
    text: rng.pick(templates),
    tone: 'RELATIONSHIP',
    priority: FEED_PRIORITIES.RELATIONSHIP
  };
}

export function createGeneralEntry(
  rng: RNG,
  cycle: number,
  text: string
): FeedEntry {
  return {
    id: entryId(rng, cycle, 'general'),
    cycle,
    text,
    tone: 'GENERAL',
    priority: FEED_PRIORITIES.GENERAL
  };
}
