import type { HealthCap } from "./caps";

// Caps that assume a pool a creator could drain. A bonding curve has no pool.
const POOL_PULL = new Set([
  "liquidity_zero",
  "liquidity_tiny",
  "liquidity_thin",
  "liquidity_unknown",
  "fresh_launch",
]);

export const CURVE_CAP: HealthCap = {
  key: "bonding_curve",
  max: 7,
  reason:
    "Still on the pump.fun bonding curve: there is no pool yet, so the liquidity shown is the curve's reserves.",
};

export function applyCurveRules(caps: HealthCap[], onCurve: boolean): HealthCap[] {
  if (!onCurve) return caps;
  return [...caps.filter((c) => !POOL_PULL.has(c.key)), CURVE_CAP];
}
