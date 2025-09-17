import { BLOOD_OATH_DURATION, TOTAL_ACTIVE_OFFICERS } from "./constants";
import { addMerit, createOfficer, markDead, pushMemory } from "./officer";
import { CycleTrigger, Officer, OfficerStatus, TimelineEntry, WorldState } from "./types";
import { RNG } from "./rng";

interface DeathResult {
  updatedOfficers: Officer[];
  casualties: Array<{ officerId: string; status: OfficerStatus; reason: "BATTLE" | "BLOOD_OATH" }>;
  feed: TimelineEntry[];
}

function needsBloodOathExecution(officer: Officer, cycle: number): boolean {
  if (!officer.relationships.bloodOathWith) return false;
  return officer.lastBloodOathCycle !== undefined && cycle - officer.lastBloodOathCycle <= BLOOD_OATH_DURATION;
}

/**
 * Verwaltet das Offiziers-Roster und garantiert die 20-Slots-Invariante.
 */
export class OfficerManager {
  constructor(private readonly rng: RNG, private readonly state: WorldState) {}

  /**
   * Liefert alle lebenden Offiziere.
   *
   * @example
   * const alive = manager.getAlive();
   */
  getAlive(): Officer[] {
    return this.state.officers.filter(o => o.status === "ALIVE");
  }

  /**
   * Liefert einen Offizier anhand der Id.
   *
   * @example
   * const orc = manager.getById(id);
   */
  getById(id: string): Officer | undefined {
    return this.state.officers.find(o => o.id === id);
  }

  /**
   * Merkt den Todesfall eines Offiziers und triggert Blutschwüre.
   *
   * @example
   * const result = manager.registerDeath(officerId, cycle);
   */
  registerDeath(officerId: string, cycle: number): DeathResult {
    const casualties: DeathResult["casualties"] = [];
    const feed: TimelineEntry[] = [];
    const updated = this.state.officers.map(officer => {
      if (officer.id !== officerId) return officer;
      casualties.push({ officerId, status: "DEAD", reason: "BATTLE" });
      feed.push({ id: `death_${officerId}_${cycle}`, cycle, text: `${officer.name} fällt im Kampf`, tags: ["DEATH"] });
      return markDead(officer);
    });

    const fallen = updated.find(o => o.id === officerId);
    if (fallen && fallen.relationships.bloodOathWith) {
      const partnerId = fallen.relationships.bloodOathWith;
      const partnerIndex = updated.findIndex(o => o.id === partnerId);
      if (partnerIndex >= 0) {
        const partner = updated[partnerIndex];
        if (partner.status === "ALIVE" && needsBloodOathExecution(partner, cycle)) {
          casualties.push({ officerId: partner.id, status: "DEAD", reason: "BLOOD_OATH" });
          feed.push({
            id: `blood_${partner.id}_${cycle}`,
            cycle,
            text: `${partner.name} stirbt durch den Blutschwur mit ${fallen.name}`,
            tags: ["DEATH", "BLOODOATH"]
          });
          updated[partnerIndex] = markDead(partner);
        }
      }
    }

    this.state.officers = updated;
    return { updatedOfficers: updated, casualties, feed };
  }

  /**
   * Verleiht Merit und speichert eine Erinnerung.
   *
   * @example
   * manager.rewardMerit(id, 10, cycle);
   */
  rewardMerit(officerId: string, amount: number, cycle: number, reason: string): void {
    this.state.officers = this.state.officers.map(officer => {
      if (officer.id !== officerId) return officer;
      const withMerit = addMerit(officer, amount);
      return pushMemory(withMerit, { cycle, type: "WARCALL", notes: reason });
    });
  }

  /**
   * Füllt leere Slots wieder auf.
   *
   * @example
   * const recruits = manager.ensureRoster(cycle);
   */
  ensureRoster(cycle: number): Officer[] {
    const recruits: Officer[] = [];
    while (this.getAlive().length < TOTAL_ACTIVE_OFFICERS) {
      const recruit = createOfficer(this.rng, { rank: "Grunzer" });
      const withMemory = pushMemory(recruit, { cycle, type: "WARCALL", notes: "Frisch rekrutiert" });
      recruits.push(withMemory);
      this.state.officers.push(withMemory);
    }
    return recruits;
  }

  /**
   * Aktualisiert den Blutschwur-Zähler eines Duos.
   *
   * @example
   * manager.registerBloodOath(a, b, cycle);
   */
  registerBloodOath(a: string, b: string, cycle: number): void {
    this.state.officers = this.state.officers.map(officer => {
      if (officer.id === a) {
        return {
          ...officer,
          relationships: { ...officer.relationships, bloodOathWith: b },
          lastBloodOathCycle: cycle
        };
      }
      if (officer.id === b) {
        return {
          ...officer,
          relationships: { ...officer.relationships, bloodOathWith: a },
          lastBloodOathCycle: cycle
        };
      }
      return officer;
    });
  }

  /**
   * Prüft, ob der Cycle aufgrund eines Todes enden muss.
   *
   * @example
   * const trigger = manager.detectCycleTrigger();
   */
  detectCycleTrigger(prevAliveCount: number): CycleTrigger | null {
    const alive = this.getAlive().length;
    return alive < prevAliveCount ? "OFFICER_DEATH" : null;
  }
}
