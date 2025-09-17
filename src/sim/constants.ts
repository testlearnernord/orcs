/**
 * Globale Konstanten, die Balancing-Werte für die Simulation beschreiben.
 * Die Werte orientieren sich an der ersten Pitch-Spezifikation und können
 * später einfach zentral angepasst werden.
 */
import { Rank, Trait } from "./types";

export const TOTAL_ACTIVE_OFFICERS = 20;
export const WARCALL_ACTIVE_MIN = 2;
export const WARCALL_ACTIVE_MAX = 4;
export const BLOOD_OATH_DURATION = 10;
export const FREE_ROAM_CYCLE_TIMEOUT_MINUTES = 15;

export const PROMOTION_THRESHOLDS: Record<Rank, { promoteAtMerit: number | null; demoteBelowMerit: number | null }> = {
  Grunzer: { promoteAtMerit: 40, demoteBelowMerit: null },
  Späher: { promoteAtMerit: 90, demoteBelowMerit: 20 },
  Captain: { promoteAtMerit: 160, demoteBelowMerit: 60 },
  Anführer: { promoteAtMerit: 240, demoteBelowMerit: 120 },
  Herausforderer: { promoteAtMerit: 360, demoteBelowMerit: 200 },
  König: { promoteAtMerit: null, demoteBelowMerit: 260 }
};

export const TRAIT_COMBAT_MODIFIERS: Record<Trait, number> = {
  Berserker: 1.15,
  Taktiker: 1.1,
  Feigling: 0.85,
  UnsterblichGeruecht: 1.05,
  Tierbaendiger: 1.05,
  Diplomat: 1.0,
  Schleicher: 1.05,
  GraueEminenz: 1.0
};

export const TRAIT_SYNERGY_BONUS: Partial<Record<Trait, number>> = {
  Taktiker: 0.05,
  Diplomat: 0.03,
  GraueEminenz: 0.06
};

export const BASE_TRAITS: Trait[] = [
  "Berserker",
  "Taktiker",
  "Feigling",
  "UnsterblichGeruecht",
  "Tierbaendiger",
  "Diplomat",
  "Schleicher",
  "GraueEminenz"
];

export const CLANS = [
  "Eisenfaust",
  "Schlackenmaehne",
  "Blutfaenger",
  "Glutfaust",
  "Ascheklaue"
];

export const LOCATIONS = [
  "Schlackengrube",
  "Schädelhügel",
  "Schwarzmoor",
  "Aschepass",
  "Blutforst",
  "Fungusgrotte"
];

export const NAME_PREFIX = [
  "Gor",
  "Muz",
  "Shag",
  "Ug",
  "Sna",
  "Krak",
  "Naz",
  "Bog",
  "Ruk",
  "Lug"
];

export const NAME_SUFFIX = [
  "zug",
  "gash",
  "rin",
  "lok",
  "ga",
  "hka",
  "grok",
  "dur",
  "dug",
  "dash"
];

export const DEFAULT_TITLE_POOL = [
  "Bestienjäger",
  "Schattenklinge",
  "Schinder",
  "Lagermeister",
  "Brandstifter",
  "Seher"
];
