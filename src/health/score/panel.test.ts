import { describe, expect, it } from "vitest";
import type { HealthFactor } from "../factors/types";
import { buildPanel } from "./panel";

const SAFETY = [
  "security_authorities", "security_transfer_fee", "security_jupiter",
  "creator_rugged", "creator_allocation", "liquidity_lp_lock", "liquidity_usd",
  "liquidity_ratio", "holders_top", "holders_top10", "holders_insiders",
];
const SETUP = [
  "market_5m", "market_1h", "market_6h", "market_24h", "market_drawdown",
  "market_volatility", "market_recovery", "flow", "flow_24h", "flow_activity",
  "liquidity_turnover", "liquidity_impact", "holders_count",
  "lifecycle_token_age", "lifecycle_pair_age",
];

const f = (key: string, value: number | null): HealthFactor =>
  ({
    key,
    label: key,
    group: "MARKET",
    status: value === null ? "N/A" : "AVAILABLE",
    value,
    unit: value === null ? null : "score",
    explanation: `${key} note`,
  }) as unknown as HealthFactor;

const all = (keys: string[], value: number | null) => keys.map((k) => f(k, value));
const cap = (key: string, max: number, reason = `${key} reason`) => ({ key, max, reason });
const base = { coverage: 0.9, missingCritical: false };

describe("buildPanel scores", () => {
  it("scores a sound token highly", () => {
    const p = buildPanel({ ...base, factors: [...all(SAFETY, 9), ...all(SETUP, 8)], caps: [] });
    expect(p.safety).toBe(9);
    expect(p.setup).toBe(8);
    expect(p.verdict).toBe("Sound structure and healthy tape");
  });

  it("splits structure from tape on a deep fall that held up", () => {
    const p = buildPanel({
      ...base,
      factors: [...all(SAFETY, 9), ...all(SETUP, 2)],
      caps: [cap("fall_24h_held", 5)],
    });
    expect(p.safety).toBe(9);
    expect(p.setup).toBe(2);
    expect(p.verdict).toBe("Sound structure, weak tape");
  });

  it("applies safety caps to safety only", () => {
    const p = buildPanel({
      ...base,
      factors: [...all(SAFETY, 9), ...all(SETUP, 9)],
      caps: [cap("liquidity_unknown", 3)],
    });
    expect(p.safety).toBe(3);
    expect(p.setup).toBe(9);
    expect(p.verdict).toBe("Serious structural red flags");
  });

  it("does not let one lonely check read as a confident score", () => {
    const factors = SAFETY.map((k) => f(k, k === "liquidity_lp_lock" ? 10 : null));
    const p = buildPanel({ ...base, factors, caps: [] });
    expect(p.safety).toBeCloseTo(6.7, 1);
    expect(p.safetyConfidence).toBeCloseTo(0.09, 2);
  });

  it("admits when there is nothing to judge", () => {
    const p = buildPanel({ ...base, factors: all(SAFETY, null), caps: [] });
    expect(p.safety).toBeNull();
    expect(p.verdict).toBe("Not enough data to judge");
  });
});

describe("buildPanel confidence and reasons", () => {
  it("grades confidence from coverage and critical data", () => {
    const run = (coverage: number, missingCritical = false) =>
      buildPanel({ factors: [], caps: [], coverage, missingCritical }).confidence;
    expect(run(0.9)).toBe("High");
    expect(run(0.7)).toBe("Medium");
    expect(run(0.5)).toBe("Low");
    expect(run(0.95, true)).toBe("Low");
  });

  it("leads with the binding cap, then weak and strong factors", () => {
    const p = buildPanel({
      ...base,
      factors: [f("holders_top", 9.5), f("flow", 1.5), f("market_24h", 2.5)],
      caps: [cap("pool_young", 6.5, "The pool is under 24 hours old.")],
    });
    expect(p.reasons[0]).toEqual({ tone: "bad", text: "The pool is under 24 hours old." });
    expect(p.reasons.filter((r) => r.tone === "bad")).toHaveLength(3);
    expect(p.reasons.some((r) => r.tone === "good" && r.text === "holders_top note")).toBe(true);
  });

  it("says what would change the picture", () => {
    const p = buildPanel({
      ...base,
      factors: [],
      caps: [cap("pool_young", 6.5), cap("rugged", 1)],
    });
    expect(p.watchFor).toEqual(["The pool passes 24 hours of age."]);
  });
});
