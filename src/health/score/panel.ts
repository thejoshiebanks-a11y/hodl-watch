import type { HealthFactor } from "../factors/types";
import type { HealthCap } from "./caps";

export type PanelReason = { tone: "good" | "bad"; text: string };

export type Panel = {
  safety: number | null;
  setup: number | null;
  safetyConfidence: number;
  setupConfidence: number;
  verdict: string;
  confidence: "High" | "Medium" | "Low";
  reasons: PanelReason[];
  watchFor: string[];
};

// Is this a trap? Contract, creator, liquidity safety and holder concentration.
const SAFETY_KEYS = new Set([
  "security_authorities",
  "security_transfer_fee",
  "security_jupiter",
  "creator_rugged",
  "creator_allocation",
  "liquidity_lp_lock",
  "liquidity_usd",
  "liquidity_ratio",
  "holders_top",
  "holders_top10",
  "holders_insiders",
  "flow_wash_volume",
  "flow_wash_txns",
]);

// Is the tape in good shape? Price action, flow, turnover, holder base, age.
const SETUP_KEYS = new Set([
  "market_5m",
  "market_1h",
  "market_6h",
  "market_24h",
  "market_drawdown",
  "market_volatility",
  "market_recovery",
  "flow",
  "flow_24h",
  "flow_activity",
  "liquidity_turnover",
  "liquidity_impact",
  "holders_count",
  "holders_trend",
  "lifecycle_token_age",
  "lifecycle_pair_age",
]);

const SETUP_CAP = /^(crash_|fall_|price_peak_|sell_pressure|pool_|partial)/;
const capSide = (key: string): "setup" | "safety" =>
  SETUP_CAP.test(key) ? "setup" : "safety";

const UNLOCK: Record<string, string> = {
  liquidity_unknown: "Liquidity becomes readable and the pool is confirmed to hold funds.",
  liquidity_zero: "Liquidity is added back to the pool.",
  liquidity_tiny: "Liquidity rises above $5K.",
  liquidity_thin: "Liquidity rises above $20K.",
  mint_authority: "Mint authority is revoked.",
  freeze_authority: "Freeze authority is revoked.",
  top_holder_extreme: "The largest wallet's share falls below 50%.",
  top_holder_high: "The largest wallet's share falls below 30%.",
  insiders_extreme: "Insider supply falls below 40%.",
  insiders_high: "Insider supply falls below 20%.",
  pool_new: "The pool passes 1 hour of age.",
  pool_young: "The pool passes 24 hours of age.",
  sell_pressure: "Buys make up more than 30% of the last hour's trades.",
  crash_24h: "The 24h window rolls past the fall, or price recovers.",
  fall_24h: "The 24h window rolls past the fall, or price recovers.",
  fall_24h_held: "The 24h window rolls past the fall, or price recovers.",
  crash_6h: "The 6h window rolls past the fall, or price recovers.",
  crash_1h: "The 1h window rolls past the fall, or price recovers.",
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const finite = (f: HealthFactor): f is HealthFactor & { value: number } =>
  f.status === "AVAILABLE" && typeof f.value === "number" && Number.isFinite(f.value);

/**
 * Average of the checks we could observe, pulled toward a cautious 4 when few
 * of them were observed, so thin evidence never reads as a confident score.
 */
function bucket(factors: HealthFactor[], keys: Set<string>) {
  const inBucket = factors.filter((f) => keys.has(f.key));
  const seen = inBucket.filter(finite);
  if (seen.length === 0) return { score: null, confidence: 0 };
  const mean = seen.reduce((s, f) => s + f.value, 0) / seen.length;
  const confidence = seen.length / inBucket.length;
  const w = 0.4 + 0.6 * confidence;
  return { score: mean * w + 4 * (1 - w), confidence };
}

function verdictFor(
  safety: number | null,
  setup: number | null,
  hardFlag: boolean,
): string {
  if (safety === null && setup === null) return "Not enough data to judge";
  if (safety === null) return "Structure could not be checked";
  if (hardFlag) return "Serious structural red flags";
  if (safety < 4) return "Weak structure";
  if (safety >= 7) {
    if (setup === null) return "Sound structure";
    if (setup >= 6) return "Sound structure and healthy tape";
    if (setup >= 4) return "Sound structure, mixed tape";
    return "Sound structure, weak tape";
  }
  if (setup !== null && setup >= 6) return "Healthy tape, structure has gaps";
  return "Mixed structure and tape";
}

export function buildPanel(input: {
  factors: HealthFactor[];
  extraFactors?: HealthFactor[];
  caps: HealthCap[];
  coverage: number;
  missingCritical: boolean;
}): Panel {
  const factors = [...input.factors, ...(input.extraFactors ?? [])];
  const { caps } = input;

  const s = bucket(factors, SAFETY_KEYS);
  const t = bucket(factors, SETUP_KEYS);

  const safetyCaps = caps.filter((c) => capSide(c.key) === "safety");
  const setupCaps = caps.filter((c) => capSide(c.key) === "setup");
  const lowest = (list: HealthCap[]) =>
    list.length ? Math.min(...list.map((c) => c.max)) : 10;

  const safety = s.score === null ? null : r1(Math.min(s.score, lowest(safetyCaps)));
  const setup = t.score === null ? null : r1(Math.min(t.score, lowest(setupCaps)));
  const hardFlag = safetyCaps.some((c) => c.max <= 3);

  const confidence: Panel["confidence"] =
    input.missingCritical || input.coverage < 0.6
      ? "Low"
      : input.coverage >= 0.8
        ? "High"
        : "Medium";

  const reasons: PanelReason[] = [];
  if (caps.length > 0) reasons.push({ tone: "bad", text: caps[0].reason });

  const seen = factors.filter(finite);
  for (const f of [...seen].filter((x) => x.value < 4).sort((a, b) => a.value - b.value).slice(0, 3)) {
    reasons.push({ tone: "bad", text: f.explanation || f.label });
  }
  for (const f of [...seen].filter((x) => x.value >= 7.5).sort((a, b) => b.value - a.value).slice(0, 2)) {
    reasons.push({ tone: "good", text: f.explanation || f.label });
  }

  const watchFor = caps
    .map((c) => UNLOCK[c.key])
    .filter((x): x is string => typeof x === "string")
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 3);

  return {
    safety,
    setup,
    safetyConfidence: Number(s.confidence.toFixed(2)),
    setupConfidence: Number(t.confidence.toFixed(2)),
    verdict: verdictFor(safety, setup, hardFlag),
    confidence,
    reasons,
    watchFor,
  };
}
