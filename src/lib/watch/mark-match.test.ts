import { describe, expect, it } from "vitest";
import { decideMark, markChangePct } from "./mark-match";

describe("markChangePct", () => {
  it("measures the move from the mark", () => {
    expect(markChangePct(100, 76)).toBeCloseTo(-24);
    expect(markChangePct(100, 130)).toBeCloseTo(30);
  });
  it("is null when data is missing or unusable", () => {
    expect(markChangePct(null, 5)).toBeNull();
    expect(markChangePct(5, null)).toBeNull();
    expect(markChangePct(0, 5)).toBeNull();
  });
});

describe("decideMark", () => {
  it("fires once when the price falls through the threshold", () => {
    expect(decideMark(-25, 20, null, "none")).toEqual({ fire: "MARK_BELOW", zone: "below" });
    expect(decideMark(-30, 20, null, "below")).toEqual({ fire: null, zone: "below" });
  });
  it("re-arms after the price recovers", () => {
    expect(decideMark(-5, 20, null, "below")).toEqual({ fire: null, zone: "none" });
    expect(decideMark(-22, 20, null, "none").fire).toBe("MARK_BELOW");
  });
  it("fires on the rise side only when that rule is on", () => {
    expect(decideMark(40, 20, null, "none").fire).toBeNull();
    expect(decideMark(40, 20, 30, "none")).toEqual({ fire: "MARK_ABOVE", zone: "above" });
  });
  it("does nothing without a usable change", () => {
    expect(decideMark(null, 20, 30, "below")).toEqual({ fire: null, zone: "below" });
  });
});
