import { describe, expect, it } from "vitest";
import { World } from "@sim/world";
import { OfficerManager } from "@sim/officerManager";
import { RNG } from "@sim/rng";
import { createOfficer } from "@sim/officer";
import { WorldState } from "@sim/types";

describe("Cycle simulation", () => {
  it("produces deterministic summaries for identical seeds", () => {
    const worldA = new World({ seed: 42 });
    const worldB = new World({ seed: 42 });

    const firstA = worldA.runCycle();
    const firstB = worldB.runCycle();
    expect(firstA).toEqual(firstB);

    const secondA = worldA.runCycle();
    const secondB = worldB.runCycle();
    expect(secondA).toEqual(secondB);
  });

  it("kills blood oath partners when one officer falls", () => {
    const rng = new RNG(99);
    const a = createOfficer(rng, {
      id: "a",
      relationships: { friends: [], rivals: [], loyalToKing: false, bloodOathWith: "b" },
      lastBloodOathCycle: 0
    });
    const b = createOfficer(rng, {
      id: "b",
      relationships: { friends: [], rivals: [], loyalToKing: false, bloodOathWith: "a" },
      lastBloodOathCycle: 0
    });
    const state: WorldState = { cycle: 5, officers: [a, b], warcalls: [], kingId: "a", playerId: "b", feed: [] };
    const manager = new OfficerManager(rng, state);
    const result = manager.registerDeath("a", 5);

    expect(result.casualties).toHaveLength(2);
    const updatedA = state.officers.find(o => o.id === "a");
    const updatedB = state.officers.find(o => o.id === "b");
    expect(updatedA?.status).toBe("DEAD");
    expect(updatedB?.status).toBe("DEAD");
  });
});
