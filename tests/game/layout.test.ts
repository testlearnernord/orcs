import { describe, expect, it } from "vitest";

import {
  computeOfficerPositions,
  DEFAULT_OFFICER_GRID,
  createAdaptiveGridConfig
} from "@game/ui/layout";

=======

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


  it("adapts columns for wider boards", () => {
    const config = createAdaptiveGridConfig({ x: 40, y: 80, width: 820, height: 520 }, 20);
    expect(config.columns).toBeGreaterThanOrEqual(5);
    const lastColumnX = config.originX + (config.columns - 1) * config.cellWidth;
    expect(lastColumnX).toBeLessThanOrEqual(40 + 820);
  });

  it("reduces columns when the board is narrow", () => {
    const config = createAdaptiveGridConfig({ x: 40, y: 80, width: 420, height: 520 }, 20);
    expect(config.columns).toBeLessThanOrEqual(4);
    expect(config.originX).toBeGreaterThanOrEqual(40);
  });

  it("falls back to the default grid when the area collapses", () => {
    const config = createAdaptiveGridConfig({ x: 0, y: 0, width: 0, height: 0 }, 20);
    expect(config).toEqual(DEFAULT_OFFICER_GRID);
  });

});
