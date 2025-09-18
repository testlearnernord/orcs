export type OrcId = string;

export type Trait =
  | 'Feigling'
  | 'Berserker'
  | 'Hinterhältig'
  | 'Trinkfest'
  | 'Tierjäger'
  | 'Intrigant';

export type Rank = 'König' | 'Spieler' | 'Captain' | 'Späher' | 'Grunzer';

export interface Personality {
  gier: number;
  tapferkeit: number;
  loyalitaet: number;
  stolz: number;
}

export type OfficerStatus = 'ALIVE' | 'DEAD';

export type RelationshipType = 'ALLY' | 'RIVAL' | 'BLOOD_OATH' | 'FRIEND';

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
  name: string;
  rank: Rank;
  level: number;
  merit: number;
  traits: Trait[];
  personality: Personality;
  relationships: Relationship[];
  portraitSeed: string;
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

export interface WarcallPlan {
  id: string;
  cycleAnnounced: number;
  resolveOn: number;
  initiator: OrcId;
  participants: OrcId[];
  location: string;
  baseDifficulty: number;
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

export interface WorldState {
  seed: string;
  cycle: number;
  officers: Officer[];
  graveyard: Officer[];
  warcalls: WarcallPlan[];
  kingId: OrcId;
  kingStatus: 'UNGEFESTIGT' | 'GEFESTIGT';
  kingStatusExpires: number;
  feed: FeedEntry[];
}
