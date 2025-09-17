import { describe, expect, it } from "vitest";

import { getPortraitVariantCount, portraitIndexForId } from "@game/ui/portraits";

describe("portraits", () => {
  it("exposes exactly forty variants", () => {
    expect(getPortraitVariantCount()).toBe(40);
  });

  it("maps officer ids deterministically into range", () => {
    const sampleId = "officer_alpha";
    const first = portraitIndexForId(sampleId);
    const second = portraitIndexForId(sampleId);
    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(getPortraitVariantCount());
  });

  it("spreads different ids across multiple portraits", () => {
    const ids = ["omega", "sigma", "lambda", "theta", "kappa", "iota", "tau", "rho"];
    const indices = new Set(ids.map(id => portraitIndexForId(id)));
    expect(indices.size).toBeGreaterThanOrEqual(5);
  });
});

