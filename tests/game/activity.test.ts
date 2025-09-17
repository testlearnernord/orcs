import { describe, expect, it } from "vitest";
import { describeOfficerActivity } from "@game/ui/activity";
import { resolveParticipantRole } from "@game/ui/warcallUi";
import { createOfficer } from "@sim/officer";
import { RNG } from "@sim/rng";
import type { Officer, Warcall } from "@sim/types";

function makeLookup(officers: Officer[]): (id: string) => Officer | undefined {
  const map = new Map(officers.map(officer => [officer.id, officer] as const));
  return id => map.get(id);
}

describe("Officer activity descriptor", () => {
  it("meldet Freies Spiel ohne aktive Warcalls", () => {
    const rng = new RNG(1);
    const scout = createOfficer(rng, { id: "scout" });

    const activity = describeOfficerActivity(scout, [], makeLookup([scout]));
    expect(activity.summary).toBe("Freies Spiel");
    expect(activity.warcallId).toBeUndefined();
  });

  it("liefert Rolle und Ort für aktive Warcalls", () => {
    const rng = new RNG(2);
    const leader = createOfficer(rng, { id: "lead" });
    const ally = createOfficer(rng, { id: "ally" });
    const rival = createOfficer(rng, {
      id: "rival",
      relationships: { friends: [], rivals: [leader.id], loyalToKing: false }
    });

    const warcall: Warcall = {
      id: "wc1",
      type: "OVERFALL",
      source: "AGENDA",
      initiator: leader.id,
      participants: [leader.id, ally.id, rival.id],
      hiddenRoles: [],
      location: "Rotpass",
      startCycle: 3,
      deadlineCycle: 3,
      rewards: { xp: 20, merit: 15, titles: [] },
      state: "ANNOUNCED"
    };

    const activity = describeOfficerActivity(ally, [warcall], makeLookup([leader, ally, rival]));
    expect(activity.summary).toContain("Überfall");
    expect(activity.summary).toContain("Rotpass");
    expect(activity.role).toBe("Supporter");

    const rivalRole = resolveParticipantRole(warcall, rival, leader);
    expect(rivalRole).toBe("Rivale");
  });
});
