import type { ScanSuccess } from "@/lib/types/scan";
import { summarizeHealthGroups } from "@/health/score/groups";
import { MIN_FLOW_TRANSACTIONS } from "@/health/factors/flow";

type Data = ScanSuccess["data"];

export type WatchSnapshot = {
  mint: string;
  symbol: string | null;
  at: string;
  health: number | null;
  partial: boolean;
  domains: Record<string, number | null>;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume1hUsd: number | null;
  volume24hUsd: number | null;
  buyShare: number | null;
  flowWindow: "1h" | "6h" | null;
  lpLockedPct: number | null;
  topHolderPct: number | null;
  holderCount: number | null;
  insiderSupplyPct: number | null;
  creatorBalance: number | null;
  rugged: boolean | null;
  mintAuthority: string;
  freezeAuthority: string;
  transferFeePct: number | null;
  poolCount: number | null;
};

function flowShare(d: Data): {
  share: number | null;
  window: "1h" | "6h" | null;
} {
  const p = d.market.periods;
  for (const [w, per] of [["1h", p.h1], ["6h", p.h6]] as const) {
    const b = per.buys;
    const s = per.sells;
    if (b !== null && s !== null && b + s >= MIN_FLOW_TRANSACTIONS) {
      return { share: (b / (b + s)) * 100, window: w };
    }
  }
  return { share: null, window: null };
}

export function toSnapshot(d: Data): WatchSnapshot {
  const domains: Record<string, number | null> = {};
  for (const g of summarizeHealthGroups(d.factors)) {
    domains[g.group] = g.score;
  }
  const flow = flowShare(d);
  const i = d.identity;
  const p = d.market.periods;

  return {
    mint: d.market.mint,
    symbol: d.market.symbol,
    at: d.market.observedAt,
    health: d.health.score,
    partial: d.health.partial || d.health.missingCritical,
    domains,
    priceUsd: d.market.priceUsd,
    // Curve reserves move with every trade, so they are not alert-worthy.
    liquidityUsd: d.market.bondingCurve ? null : d.market.liquidityUsd,
    volume1hUsd: p.h1.volumeUsd,
    volume24hUsd: p.h24.volumeUsd,
    buyShare: flow.share,
    flowWindow: flow.window,
    lpLockedPct: i.lpLockedPctWeighted,
    topHolderPct: i.topHolderPctExcludingKnown ?? i.topHolderPct,
    holderCount: i.holderCount,
    insiderSupplyPct: i.insiderSupplyPct,
    creatorBalance: i.creatorBalance,
    rugged: i.rugged,
    mintAuthority: i.mintAuthority,
    freezeAuthority: i.freezeAuthority,
    transferFeePct: i.transferFeePct,
    poolCount: i.poolCount,
  };
}
