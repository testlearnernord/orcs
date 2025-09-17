/**
 * Gemeinsame Typdefinitionen für die gesamte Simulation. Die Typescript-Typen
 * bilden die Pitch-Spezifikation ab und halten die Module locker gekoppelt.
 */

export type OrcId = string;

export type Trait =
  | "Berserker"
  | "Taktiker"
  | "Feigling"
  | "UnsterblichGeruecht"
  | "Tierbaendiger"
  | "Diplomat"
  | "Schleicher"
  | "GraueEminenz";

export type Rank =
  | "Grunzer"
  | "Späher"
  | "Captain"
  | "Anführer"
  | "Herausforderer"
  | "König";

export type OfficerStatus = "ALIVE" | "DEAD" | "MISSING";

export interface Personality {
  aggression: number;
  loyalty: number;
  opportunism: number;
  ambition: number;
}

export interface RelationshipNetwork {
  friends: OrcId[];
  rivals: OrcId[];
  bloodOathWith?: OrcId;
  loyalToKing: boolean;
}

export interface Memory {
  cycle: number;
  type: "BETRAYAL" | "ALLY_SLAIN" | "PROMOTION" | "DEMOTION" | "WARCALL";
  by?: OrcId;
  notes?: string;
}

export interface Officer {
  id: OrcId;
  name: string;
  clan: string;
  titles: string[];
  level: number;
  rank: Rank;
  merit: number;
  combatStyle: string[];
  traits: Trait[];
  equipment: { weapon: string; armor: string; trinket?: string };
  gearScore: number;
  status: OfficerStatus;
  personality: Personality;
  relationships: RelationshipNetwork;
  memories: Memory[];
  territory: string[];
  lastBloodOathCycle?: number;
}

export type WarcallType =
  | "FEAST"
  | "OVERFALL"
  | "ASSASSINATION"
  | "HUNT"
  | "MONSTER_HUNT"
  | "PURGE";

export type WarcallSource = "AGENDA" | "RANDOM" | "PLAYER";
export type WarcallState = "ANNOUNCED" | "IN_PROGRESS" | "RESOLVED";

export interface HiddenRole {
  who: OrcId;
  role: "ASSASSIN" | "TRAITOR" | "LOYALIST";
}

export interface Warcall {
  id: string;
  type: WarcallType;
  source: WarcallSource;
  initiator: OrcId;
  participants: OrcId[];
  hiddenRoles: HiddenRole[];
  location: string;
  startCycle: number;
  deadlineCycle: number;
  rewards: { xp: number; merit: number; titles: string[] };
  state: WarcallState;
}

export interface WarcallCasualty {
  officerId: OrcId;
  status: OfficerStatus;
  reason: "BATTLE" | "BLOOD_OATH";
}

export interface WarcallResolution {
  warcall: Warcall;
  victorious: OrcId[];
  defeated: OrcId[];
  betrayals: OrcId[];
  casualties: WarcallCasualty[];
  feedEntries: TimelineEntry[];
}

export interface HierarchyChange {
  officerId: OrcId;
  from: Rank;
  to: Rank;
}

export type CycleTrigger = "WARCALL_COMPLETED" | "FREE_ROAM_TIMEOUT" | "OFFICER_DEATH" | "DEBUG";

export interface TimelineEntry {
  id: string;
  cycle: number;
  text: string;
  tags: string[];
}

export interface WorldState {
  cycle: number;
  officers: Officer[];
  warcalls: Warcall[];
  kingId: OrcId;
  playerId: OrcId;
  feed: TimelineEntry[];
}

export interface CycleSummary {
  cycle: number;
  trigger: CycleTrigger;
  newWarcalls: Warcall[];
  resolved: WarcallResolution[];
  hierarchyChanges: HierarchyChange[];
  replacements: Officer[];
  feed: TimelineEntry[];
}
