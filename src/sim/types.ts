export type OrcId = string;

// Modern trait system - independent from archetypes
export type Trait = 
  // Archetype traits (determine combat style)
  | 'Archer' 
  | 'Trapper'
  // Berserker is default when no archetype trait is present
  
  // Physical traits
  | 'Robust' // 5% mehr HP *
  | 'Weich' // -5% HP
  | 'lange Beine' // 10% mehr Worldmap Speed / 5% mehr PLAYER Mode Speed
  | 'kurze Beine' // -10% Worldmap Speed / -5% weniger PLAYER mode Speed
  
  // Social traits
  | 'Nobel' // Erhält 15% mehr MERIT, andere Offiziere sind eher loyal *
  | 'Primitiv' // Erhält 15% weniger Merit, andere Offiziere sind eher disloyal *
  | 'Freundlich' // Geht gerne Allianzen ein, ist eher Loyal
  | 'Unfreundlich' // Geht gerne Rivalitäten ein, ist eher unloyal *
  | 'Geheimnisvoll' // Verhält sich geheimnisvoll, sehr ambitioniert (für Spieler nicht sichtbar)
  
  // Mental traits
  | 'Dumm' // Sammelt 25% weniger Erfahrung
  | 'Schlau' // Sammelt 25% mehr erfahrung
  | 'Weise' // Erhält mehr Attributpunkte bei Stufenaufstieg *
  | 'Verräter' // Verrät alles und jeden
  
  // Combat specialization traits (archetype-specific)
  | 'Guter Schütze' // 25% mehr Range Schaden - ARCHER Only *
  | 'Schlechter Schütze' // 25% weniger Range Schaden - ARCHER only
  | 'Axtexperte' // 25% mehr 2 Hand Schaden - Berserker only *
  | 'Zweihandtölpel' // 25% weniger 2 Hand Schaden - Berserker only
  | 'Jäger' // 25% mehr Schaden mit der Trap - TRAPPER ONLY *
  | 'Fliegenfänger'; // 25% weniger SChaden mit der Trap - TRAPPER ONLY

// Traits marked with * can be acquired during gameplay through cycles, warcalls, etc.

export type Rank = 'König' | 'Spieler' | 'Captain' | 'Späher' | 'Grunzer';

export type PotentialRating =
  | 'Unbrauchbar' // rot - red
  | 'Dumm' // orange
  | 'Normal' // weiß - white
  | 'Fähig' // grün - green
  | 'Überdurchschnittlich' // blau - blue
  | 'Genie'; // lila - purple

export interface OfficerStats {
  potential: PotentialRating;
  level: number;
  hp: number;
  maxHp: number;
  str: number; // Stärke - wichtig für Berserker
  dex: number; // Geschicklichkeit - wichtig für Archer
  int: number; // Intelligenz - wichtig für Trapper
}

export interface OfficerMood {
  loyalitaet?: number; // Loyalität zum König (König hat keinen Wert)
  ambition: string; // Mittelfristiges Ziel/Verhalten
}

export type OfficerStatus = 'ALIVE' | 'DEAD';

export type RelationshipType = 'ALLY' | 'RIVAL';

export interface Relationship {
  with: OrcId;
  type: RelationshipType;
  sinceCycle: number;
  expiresAtCycle?: number;
}

export interface Memory {
  cycle: number;
  summary: string;
  category:
    | 'DEATH'
    | 'SPAWN'
    | 'PROMOTION'
    | 'WARCALL'
    | 'BLOOD_OATH'
    | 'RELATIONSHIP';
  details?: string;
}

export interface Officer {
  id: OrcId;
  stableId: string;
  name: string;
  rank: Rank;
  merit: number;
  traits: Trait[];
  stats: OfficerStats;
  mood: OfficerMood;
  relationships: Relationship[];
  status: OfficerStatus;
  cycleJoined: number;
  cycleDied?: number;
  memories: Memory[];
}

export interface FeedEntry {
  id: string;
  cycle: number;
  text: string;
  tone:
    | 'DEATH'
    | 'SPAWN'
    | 'PROMOTION'
    | 'WARCALL'
    | 'RELATIONSHIP'
    | 'GENERAL';
  priority: number;
}

export interface WarcallBreakdown {
  base: number;
  traits: number;
  relationships: number;
  random: number;
  logistic: number;
}

export type WarcallKind =
  | 'Feast'
  | 'Hunt'
  | 'Ambush'
  | 'Duel'
  | 'Monsterjagd'
  | 'Diplomatie'
  | 'Thronschlacht'
  | 'Infiltration'    // New: Stealth mission with hidden antagonist
  | 'Eroberung'       // New: Territory conquest requiring multiple archetypes
  | 'Sabotage';       // New: Disruption mission with betrayal mechanics

export type WarcallPhase = 'START' | 'ENDE';

export interface WarcallPlan {
  id: string;
  cycleAnnounced: number;
  resolveOn: number;
  initiator: OrcId;
  participants: OrcId[];
  location: string;
  baseDifficulty: number;
  kind: WarcallKind;
  risk: number;
  rewardHint?: string;
  breakdown?: WarcallBreakdown;
}

export interface WarcallResolution {
  warcall: WarcallPlan;
  success: boolean;
  casualties: OrcId[];
  feed: FeedEntry[];
}

export interface CycleSummary {
  cycle: number;
  warcallsResolved: WarcallResolution[];
  warcallsPlanned: WarcallPlan[];
  deaths: OrcId[];
  spawns: Officer[];
  promotions: { officerId: OrcId; from: Rank; to: Rank }[];
  feed: FeedEntry[];
}

export interface CrownState {
  reignCycles: number;
  crownPressure: number;
  tributeRate: number;
  instability: 'stable' | 'shaky' | 'crisis';
}

export interface WorldState {
  seed: string;
  cycle: number;
  version: number;
  updatedAt: number;
  officers: Officer[];
  graveyard: Officer[];
  warcalls: WarcallPlan[];
  kingId: OrcId;
  kingStatus: 'UNGEFESTIGT' | 'GEFESTIGT';
  kingStatusExpires: number;
  feed: FeedEntry[];
  playerId: OrcId | null;
  crown: CrownState;
}
