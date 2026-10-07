import { describe, expect, it } from "vitest";
import { clusterBubbles, glyphFor, type Placed } from "./bubbles";
import type { Severity } from "./detect";

const ev = (id: string, severity: Severity, at = "2026-10-07T01:00:00Z", kind = "PRICE_DROP") => ({
  id,
  at,
  severity,
  kind,
});

const at = (x: number, event: ReturnType<typeof ev>, side: "above" | "below" = "above"): Placed<ReturnType<typeof ev>> => ({
  x,
  y: 100,
  side,
  event,
});

describe("clusterBubbles", () => {
  it("keeps far-apart events separate", () => {
    const c = clusterBubbles([at(10, ev("a", "info")), at(100, ev("b", "info"))]);
    expect(c).toHaveLength(2);
  });

  it("merges close events and counts them", () => {
    const c = clusterBubbles([at(10, ev("a", "info")), at(20, ev("b", "info")), at(28, ev("c", "info"))]);
    expect(c).toHaveLength(1);
    expect(c[0].events).toHaveLength(3);
  });

  it("puts the most severe, then newest, event first", () => {
    const c = clusterBubbles([
      at(10, ev("old-warn", "warning", "2026-10-07T01:00:00Z")),
      at(12, ev("crit", "critical", "2026-10-07T00:00:00Z")),
      at(14, ev("new-warn", "warning", "2026-10-07T02:00:00Z")),
    ]);
    expect(c[0].events.map((e) => e.id)).toEqual(["crit", "new-warn", "old-warn"]);
  });

  it("never merges bubbles above the bar with ones below it", () => {
    const c = clusterBubbles([at(10, ev("a", "info"), "above"), at(12, ev("b", "info"), "below")]);
    expect(c).toHaveLength(2);
  });

  it("copes with no events", () => {
    expect(clusterBubbles([])).toEqual([]);
  });
});

describe("glyphFor", () => {
  it("picks an icon per kind", () => {
    expect(glyphFor("WHALE_BUY", "below")).toBe("🐋");
    expect(glyphFor("LIQUIDITY_DROP", "above")).toBe("💧");
    expect(glyphFor("PRICE_SPIKE", "below")).toBe("▲");
    expect(glyphFor("PRICE_DROP", "above")).toBe("▼");
    expect(glyphFor("SOMETHING_NEW", "above")).toBe("▼");
  });
});
