import { describe, it, expect } from "vitest";
import { groupEvents } from "./group";
import type { StoredEvent } from "./events";

const H = 3600_000;
const T0 = Date.parse("2026-10-17T12:00:00Z");

const ev = (
  id: string,
  mint: string,
  agoMs: number,
  severity: StoredEvent["severity"] = "info",
): StoredEvent => ({
  id,
  mint,
  symbol: mint.toUpperCase(),
  at: new Date(T0 - agoMs).toISOString(),
  kind: "PRICE_DROP",
  severity,
  title: id,
  detail: "",
});

describe("groupEvents", () => {
  it("collapses same-token alerts that are close together", () => {
    const g = groupEvents([ev("a", "x", 0), ev("b", "x", H), ev("c", "x", 2 * H)]);
    expect(g).toHaveLength(1);
    expect(g[0].events.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps different tokens apart", () => {
    const g = groupEvents([ev("a", "x", 0), ev("b", "y", 0)]);
    expect(g).toHaveLength(2);
  });

  it("splits when the gap is longer than the window", () => {
    const g = groupEvents([ev("a", "x", 0), ev("b", "x", 4 * H)]);
    expect(g).toHaveLength(2);
  });

  it("takes the worst severity", () => {
    const g = groupEvents([
      ev("a", "x", 0, "info"),
      ev("b", "x", 1000, "critical"),
      ev("c", "x", 2000, "warning"),
    ]);
    expect(g[0].severity).toBe("critical");
  });

  it("puts the newest group first and a lone alert stays alone", () => {
    const g = groupEvents([ev("old", "y", 5 * H), ev("new", "x", 0)]);
    expect(g.map((x) => x.events[0].id)).toEqual(["new", "old"]);
    expect(g[0].events).toHaveLength(1);
  });

  it("handles an empty list", () => {
    expect(groupEvents([])).toEqual([]);
  });
});
