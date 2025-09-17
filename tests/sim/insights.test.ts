import { describe, expect, it } from "vitest";
import { estimateWarcallSuccess } from "@sim/insights";
import { createOfficer } from "@sim/officer";
import { RNG } from "@sim/rng";
import type { Warcall, WorldState } from "@sim/types";

function makeBaseWorld(officers: ReturnType<typeof createOfficer>[]): WorldState {
  return {
    cycle: 5,
    officers,
    warcalls: [],
    kingId: officers[0]?.id ?? "king",
    playerId: officers[1]?.id ?? officers[0]?.id ?? "player",
    feed: []
  };
}

describe("Warcall success estimator", () => {
  it("rates starke Jagdgruppen als wahrscheinlich erfolgreich", () => {
    const rng = new RNG(12);
    const leader = createOfficer(rng, { id: "alpha", level: 9, merit: 140, rank: "Captain" });
    const ally = createOfficer(rng, { id: "beta", level: 7, merit: 90 });
    const world = makeBaseWorld([leader, ally]);

    const hunt: Warcall = {
      id: "wc_hunt",
      type: "HUNT",
      source: "AGENDA",
      initiator: leader.id,
      participants: [leader.id, ally.id],
      hiddenRoles: [],
      location: "Dornwald",
      startCycle: 5,
      deadlineCycle: 5,
      rewards: { xp: 20, merit: 16, titles: [] },
      state: "ANNOUNCED"
    };

    const chance = estimateWarcallSuccess(world, hunt);
    expect(chance).toBeGreaterThan(0.7);
  });

  it("erkennt riskante Monsterjagden von Neulingen", () => {
    const rng = new RNG(21);
    const rookie = createOfficer(rng, {
      id: "gamma",
      level: 1,
      merit: 0,
      gearScore: 1,
      traits: [],
      equipment: { weapon: "Knüppel", armor: "Fetzen" },
      relationships: { friends: [], rivals: [], loyalToKing: false }
    });
    const helper = createOfficer(rng, {
      id: "delta",
      level: 1,
      merit: 2,
      gearScore: 1,
      traits: [],
      equipment: { weapon: "Schleuder", armor: "Fetzen" },
      relationships: { friends: [], rivals: [], loyalToKing: false }
    });
    const world = makeBaseWorld([rookie, helper]);

    const monsterHunt: Warcall = {
      id: "wc_monster",
      type: "MONSTER_HUNT",
      source: "RANDOM",
      initiator: rookie.id,
      participants: [rookie.id, helper.id],
      hiddenRoles: [],
      location: "Schlundspalte",
      startCycle: 5,
      deadlineCycle: 5,
      rewards: { xp: 40, merit: 28, titles: [] },
      state: "ANNOUNCED"
    };

    const chance = estimateWarcallSuccess(world, monsterHunt);
    expect(chance).toBeLessThan(0.55);
  });

  it("bewertet Attentate gegen starke Ziele als schwierig", () => {
    const rng = new RNG(7);
    const assassin = createOfficer(rng, {
      id: "stab", level: 5, merit: 40, traits: ["Schleicher"], relationships: { friends: [], rivals: [], loyalToKing: false }
    });
    const target = createOfficer(rng, {
      id: "shield", level: 9, merit: 150, rank: "Anführer", relationships: { friends: [], rivals: [], loyalToKing: false }
    });
    const world = makeBaseWorld([assassin, target]);

    const assassination: Warcall = {
      id: "wc_assassin",
      type: "ASSASSINATION",
      source: "AGENDA",
      initiator: assassin.id,
      participants: [assassin.id, target.id],
      hiddenRoles: [{ who: assassin.id, role: "ASSASSIN" }],
      location: "Schattengrat",
      startCycle: 5,
      deadlineCycle: 5,
      rewards: { xp: 35, merit: 24, titles: [] },
      state: "ANNOUNCED"
    };

    const chance = estimateWarcallSuccess(world, assassination);
    expect(chance).toBeLessThan(0.6);
  });
});
