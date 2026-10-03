import { describe, expect, it } from "vitest";
import {
  scoreAuthority,
  scoreAuthorityPair,
  scoreTopHolderConcentration,
} from "./structure";

describe("structure factors", () => {
  it("scores revoked authority as 10", () => {
    expect(scoreAuthority("REVOKED")?.score).toBe(10);
  });

  it("scores set authority as 0", () => {
    expect(scoreAuthority("SET")?.score).toBe(0);
  });

  it("returns null for unknown authority", () => {
    expect(scoreAuthority("UNKNOWN")).toBeNull();
  });

  it("averages available authority observations", () => {
    expect(scoreAuthorityPair("REVOKED", "SET")?.score).toBe(5);
  });

  it("uses only available authority observations", () => {
    expect(scoreAuthorityPair("REVOKED", "UNKNOWN")?.score).toBe(10);
    expect(scoreAuthorityPair("UNKNOWN", "SET")?.score).toBe(0);
  });

  it("returns null when both authority observations are unknown", () => {
    expect(scoreAuthorityPair("UNKNOWN", "UNKNOWN")).toBeNull();
  });

  it("scores concentration at or below 10 percent as 10", () => {
    expect(scoreTopHolderConcentration(10)?.score).toBe(10);
    expect(scoreTopHolderConcentration(5)?.score).toBe(10);
  });

  it("scores concentration at or above 50 percent as 0", () => {
    expect(scoreTopHolderConcentration(50)?.score).toBe(0);
    expect(scoreTopHolderConcentration(75)?.score).toBe(0);
  });

  it("decreases linearly between concentration references", () => {
    expect(scoreTopHolderConcentration(30)?.score).toBe(5);
  });

  it("returns null for unavailable concentration", () => {
    expect(scoreTopHolderConcentration(null)).toBeNull();
  });

  it("rejects non-finite concentration", () => {
    expect(scoreTopHolderConcentration(Number.NaN)).toBeNull();
    expect(scoreTopHolderConcentration(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("keeps concentration scores between 0 and 10", () => {
    for (const pct of [-100, 0, 10, 25, 50, 75, 100]) {
      const score = scoreTopHolderConcentration(pct)?.score;

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
});
