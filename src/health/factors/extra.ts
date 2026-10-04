import type { TokenHolder } from "@/lib/types/identity";
import type { NormalizedFactor } from "./tape";

// All thresholds are provisional for Health v0.1.2.

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const fin = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

const out = (score: number, explanation: string): NormalizedFactor => ({
  score: Number(clamp(score, 0, 10).toFixed(2)),
  explanation,
});

// MARKET
export function scoreStability(
  changePct: number | null,
  horizon: "6h" | "24h",
): NormalizedFactor | null {
  if (!fin(changePct)) return null;
  const scale = horizon === "6h" ? 80 : 150;
  const s = 10 * Math.exp(-Math.abs(changePct) / scale);
  return out(
    s,
    `${horizon} price change is ${changePct.toFixed(2)}%, giving a ${s.toFixed(2)} stability contribution.`,
  );
}

// LIQUIDITY
export function scoreVolumeToLiquidity(
  volume24h: number | null,
  liquidityUsd: number | null,
): NormalizedFactor | null {
  if (!fin(volume24h) || !fin(liquidityUsd) || liquidityUsd <= 0) return null;
  const r = volume24h / liquidityUsd;
  const s = r < 0.02 ? 2 : r < 0.1 ? 5 : r <= 5 ? 9 : r <= 15 ? 6 : 3;
  return out(
    s,
    `24h volume is ${r.toFixed(2)}x liquidity. Very low means a dead market; very high means churn.`,
  );
}

export function scoreLpLock(pct: number | null): NormalizedFactor | null {
  if (!fin(pct)) return null;
  return out(
    pct / 10,
    `${pct.toFixed(1)}% of liquidity is locked or burned (weighted across pools).`,
  );
}

const IMPACT_TRADE_USD = 1000;

export function scorePriceImpact(
  liquidityUsd: number | null,
): NormalizedFactor | null {
  if (!fin(liquidityUsd) || liquidityUsd <= 0) return null;
  const impact =
    (100 * IMPACT_TRADE_USD) / (liquidityUsd / 2 + IMPACT_TRADE_USD);
  const s = 10 * Math.exp(-impact / 10);
  return out(
    s,
    `Estimated price impact of a $${IMPACT_TRADE_USD} buy is about ${impact.toFixed(2)}% (assumes a 50/50 constant-product pool, so it is an estimate).`,
  );
}

// FLOW
export function scoreActivity(
  buys: number | null,
  sells: number | null,
): NormalizedFactor | null {
  if (!fin(buys) || !fin(sells) || buys < 0 || sells < 0) return null;
  const n = buys + sells;
  const s = n < 50 ? 2 : n < 300 ? 5 : n < 1500 ? 8 : 10;
  return out(s, `${n} transactions in the last 24h.`);
}

// HOLDERS
export function scoreTop10ExcludingKnown(
  holders: TokenHolder[],
): NormalizedFactor | null {
  const people = holders
    .filter((h) => h.knownType === null)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);
  if (people.length === 0) return null;
  const sum = people.reduce((t, h) => t + h.pct, 0);
  const s = ((60 - sum) / 45) * 10;
  return out(
    s,
    `Top ${people.length} non-pool holders own ${sum.toFixed(2)}% of supply.`,
  );
}

export function scoreHolderCount(n: number | null): NormalizedFactor | null {
  if (!fin(n) || n <= 0) return null;
  const s = (10 * (Math.log10(n) - 1)) / 2.5;
  return out(s, `${n.toLocaleString("en-US")} holders.`);
}

export function scoreInsiderSupply(
  pct: number | null,
): NormalizedFactor | null {
  if (!fin(pct)) return null;
  return out(
    10 - pct / 2.5,
    `RugCheck flags ${pct.toFixed(1)}% of supply as held by insider-linked wallets.`,
  );
}

// CREATOR
export function scoreRugged(rugged: boolean | null): NormalizedFactor | null {
  if (rugged === null) return null;
  return rugged
    ? out(0, "RugCheck marks this token as rugged.")
    : out(10, "RugCheck does not mark this token as rugged.");
}

export function scoreCreatorAllocation(
  creator: string | null,
  holders: TokenHolder[],
): NormalizedFactor | null {
  if (!creator || holders.length === 0) return null;
  const m = holders.find((h) => h.address === creator || h.owner === creator);
  if (!m) {
    return out(9, "Creator wallet is not among the listed top holders.");
  }
  return out(
    10 - m.pct * 0.5,
    `Creator wallet holds ${m.pct.toFixed(2)}% of supply.`,
  );
}

// SECURITY
export function scoreTransferFee(
  pct: number | null,
): NormalizedFactor | null {
  if (!fin(pct)) return null;
  return pct === 0
    ? out(10, "No transfer fee.")
    : out(10 - pct * 2, `Transfer fee is ${pct}%.`);
}

export function scoreJupiter(v: boolean | null): NormalizedFactor | null {
  if (v === null) return null;
  return v
    ? out(9, "Jupiter-verified. This is a listing check, not an endorsement.")
    : out(5, "Not Jupiter-verified. Neutral, since many new tokens are not.");
}

// LIFECYCLE
export function scoreAge(
  iso: string | null,
  nowIso: string,
  label: string,
): NormalizedFactor | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(t) || !Number.isFinite(now) || t > now) return null;
  const h = (now - t) / 36e5;
  const s = h < 1 ? 1 : h < 6 ? 3 : h < 24 ? 5 : h < 72 ? 7 : h < 168 ? 8.5 : 10;
  const age = h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} hours`;
  return out(s, `${label} is ${age} old.`);
}
