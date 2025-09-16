export type OrcId = string;
export type Trait = "Berserker"|"Taktiker"|"Feigling"|"UnsterblichGerücht"|"Tierbändiger";

export interface Officer {
  id: OrcId;
  name: string;
  level: number;
  merit: number;
  title?: string;
  traits: Trait[];
  gearScore: number;
  alive: boolean;
  bloodOathWith?: OrcId;
  personality: { aggression: number; ambition: number; loyalty: number; };
  memory: string[];
}

export type WarcallType = "FestmahlDiplomatie"|"Uberfall"|"Monsterjagd"|"Tierjagd"|"Attentat";

export interface Warcall {
  id: string;
  type: WarcallType;
  participants: OrcId[];
  location: string;
  scheduledAtCycle: number;
}

export interface SimResult { events: Array<{ kind: string; text: string }>; }

export interface WorldState {
  cycle: number;
  officers: Officer[];
  warcalls: Warcall[];
  kingId: OrcId;
  playerId: OrcId;
}