export type OrcId = string;

export type Trait = 'Archer' | 'Trapper';

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
  | 'Thronschlacht';

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
