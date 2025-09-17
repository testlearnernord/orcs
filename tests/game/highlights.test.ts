import { describe, expect, it } from "vitest";
import { collectHighlightIds } from "@game/ui/highlights";
import type { CycleSummary, Officer, Warcall } from "@sim/types";

function createOfficer(id: string): Officer {
  return {
    id,
    name: `Orc ${id}`,
    clan: "Test",
    titles: [],
    level: 1,
    rank: "Grunzer",
    merit: 0,
    combatStyle: [],
    traits: [],
    equipment: { weapon: "Axt", armor: "Leder" },
    gearScore: 1,
    status: "ALIVE",
    personality: { aggression: 0.5, loyalty: 0.5, opportunism: 0.5, ambition: 0.5 },
    relationships: { friends: [], rivals: [], loyalToKing: false },
    memories: [],
    territory: []
  };
}

function createWarcall(id: string, initiator: string, participants: string[]): Warcall {
  return {
    id,
    type: "FEAST",
    source: "AGENDA",
    initiator,
    participants,
    hiddenRoles: [],
    location: "Lager",
    startCycle: 1,
    deadlineCycle: 2,
    rewards: { xp: 10, merit: 5, titles: [] },
    state: "ANNOUNCED"
  };
}

describe("collectHighlightIds", () => {
  it("returns an empty set when no summary is provided", () => {
    expect(collectHighlightIds()).toEqual(new Set());
  });

  it("collects all relevant actors", () => {
    const summary: CycleSummary = {
      cycle: 3,
      trigger: "WARCALL_COMPLETED",
      newWarcalls: [
        {
          ...createWarcall("new", "a", ["b"]),
          hiddenRoles: [{ who: "c", role: "ASSASSIN" }]
        }
      ],
      resolved: [
        {
          warcall: { ...createWarcall("resolved", "d", ["e"]), state: "RESOLVED" },
          victorious: ["d"],
          defeated: ["e"],
          betrayals: [],
          casualties: [{ officerId: "f", status: "DEAD", reason: "BLOOD_OATH" }],
          feedEntries: []
        }
      ],
      hierarchyChanges: [],
      replacements: [createOfficer("g")],
      feed: []
    };

    const ids = collectHighlightIds(summary);
    const expected = ["a", "b", "c", "d", "e", "f", "g"];
    expected.forEach(id => {
      expect(ids.has(id)).toBe(true);
    });
    expect(ids.size).toBe(expected.length);
  });
});
