import { describe, expect, it } from "vitest";
import { computeOfficerPositions, DEFAULT_OFFICER_GRID } from "@game/ui/layout";

describe("computeOfficerPositions", () => {
  it("places officers row by row", () => {
    const positions = computeOfficerPositions(6);
    expect(positions).toHaveLength(6);
    expect(positions[0]).toEqual({ x: DEFAULT_OFFICER_GRID.originX, y: DEFAULT_OFFICER_GRID.originY });
    expect(positions[1].x).toBe(DEFAULT_OFFICER_GRID.originX + DEFAULT_OFFICER_GRID.cellWidth);
    expect(positions[2].x).toBe(DEFAULT_OFFICER_GRID.originX + 2 * DEFAULT_OFFICER_GRID.cellWidth);
    expect(positions[5].y).toBe(DEFAULT_OFFICER_GRID.originY + DEFAULT_OFFICER_GRID.cellHeight);
  });

  it("supports custom grid configuration", () => {
    const custom = { columns: 3, cellWidth: 50, cellHeight: 40, originX: 10, originY: 20 } as const;
    const positions = computeOfficerPositions(4, custom);
    expect(positions[0]).toEqual({ x: 10, y: 20 });
    expect(positions[2]).toEqual({ x: 110, y: 20 });
    expect(positions[3]).toEqual({ x: 10, y: 60 });
  });
});
