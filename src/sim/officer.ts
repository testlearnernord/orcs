import { BASE_TRAITS, CLANS, DEFAULT_TITLE_POOL, LOCATIONS, NAME_PREFIX, NAME_SUFFIX } from "./constants";
import { Officer, Personality, Rank, Trait } from "./types";
import { RNG } from "./rng";

const WEAPONS = ["Axt", "Doppelaxt", "Wurfklinge", "Speer", "Kriegstrommel"];
const ARMOR = ["Leder", "Ketten", "Schuppen", "Schädelplatten"];
const TRINKETS = ["Blutring", "Schlackenfetisch", "Königszahn", "Sturmsiegel"];
const COMBAT_STYLES = ["Axt", "Wurfklinge", "Bogen", "Streitkolben", "Schamane"];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function randomName(rng: RNG): string {
  return `${rng.pick(NAME_PREFIX)}${rng.pick(NAME_SUFFIX)}`;
}

function randomPersonality(rng: RNG): Personality {
  return {
    aggression: clamp01(rng.next()),
    loyalty: clamp01(rng.next()),
    opportunism: clamp01(rng.next()),
    ambition: clamp01(rng.next())
  };
}

function randomTraits(rng: RNG): Trait[] {
  const count = rng.chance(0.3) ? 2 : 1;
  return rng.shuffle(BASE_TRAITS).slice(0, count);
}

function randomCombatStyle(rng: RNG): string[] {
  const styles = rng.shuffle(COMBAT_STYLES);
  const count = rng.chance(0.25) ? 2 : 1;
  return styles.slice(0, count);
}

function randomEquipment(rng: RNG): { weapon: string; armor: string; trinket?: string } {
  const trinket = rng.chance(0.5) ? rng.pick(TRINKETS) : undefined;
  return {
    weapon: rng.pick(WEAPONS),
    armor: rng.pick(ARMOR),
    trinket
  };
}

function baseMeritForRank(rank: Rank): number {
  switch (rank) {
    case "Grunzer": return 10;
    case "Späher": return 40;
    case "Captain": return 80;
    case "Anführer": return 140;
    case "Herausforderer": return 210;
    case "König": return 320;
  }
}

function defaultTitles(rng: RNG): string[] {
  return rng.chance(0.3) ? [rng.pick(DEFAULT_TITLE_POOL)] : [];
}

/**
 * Erstellt einen prozeduralen Offizier.
 *
 * @example
 * const officer = createOfficer(rng, { rank: "Grunzer" });
 * console.log(officer.rank);
 */
export function createOfficer(rng: RNG, options: Partial<Officer> = {}): Officer {
  const rank = options.rank ?? "Grunzer";
  const id = options.id ?? `orc_${Math.round(rng.next() * 1e9)}`;
  const equipment = options.equipment ?? randomEquipment(rng);
  const level = options.level ?? rng.int(rank === "König" ? 8 : 1, rank === "König" ? 12 : 6);
  const merit = options.merit ?? Math.max(0, Math.round(baseMeritForRank(rank) + rng.int(-15, 20)));
  const officer: Officer = {
    id,
    name: options.name ?? randomName(rng),
    clan: options.clan ?? rng.pick(CLANS),
    titles: options.titles ?? defaultTitles(rng),
    level,
    rank,
    merit,
    combatStyle: options.combatStyle ?? randomCombatStyle(rng),
    traits: options.traits ?? randomTraits(rng),
    equipment,
    gearScore: options.gearScore ?? rng.int(8, 16),
    status: options.status ?? "ALIVE",
    personality: options.personality ?? randomPersonality(rng),
    relationships: options.relationships ?? { friends: [], rivals: [], loyalToKing: false },
    memories: options.memories ?? [],
    territory: options.territory ?? [rng.pick(LOCATIONS)],
    lastBloodOathCycle: options.lastBloodOathCycle
  };
  return officer;
}

/**
 * Aktualisiert Erinnerungen eines Offiziers und limitiert die gespeicherte Menge.
 *
 * @example
 * const updated = pushMemory(officer, { cycle: 1, type: "WARCALL" });
 */
export function pushMemory(officer: Officer, memory: Officer["memories"][number], limit = 12): Officer {
  const memories = [...officer.memories, memory].slice(-limit);
  return { ...officer, memories };
}

/**
 * Erhöht den Merit-Wert eines Offiziers, ohne andere Felder zu verändern.
 *
 * @example
 * const promoted = addMerit(officer, 15);
 */
export function addMerit(officer: Officer, amount: number): Officer {
  return { ...officer, merit: Math.max(0, officer.merit + amount) };
}

/**
 * Markiert den Offizier als tot.
 *
 * @example
 * const fallen = markDead(officer);
 */
export function markDead(officer: Officer): Officer {
  return { ...officer, status: "DEAD" };
}
