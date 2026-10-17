import type { WatchEvent } from "@/lib/watch/detect";
import { money } from "./logic";

export type RecentTrade = {
  side: "buy" | "sell";
  usd: number;
  wallet: string;
  at: number; // ms
};

export const CLUSTER_WINDOW_MS = 10 * 60_000;
export const CLUSTER_MIN_WALLETS = 3;

/**
 * Several different wallets trading the same way in a short window.
 * Returns an alert for the stronger side, or null.
 */
export function clusterEvent(
  trades: RecentTrade[],
  liquidityUsd: number | null,
  now: number,
): WatchEvent | null {
  if (typeof liquidityUsd !== "number" || !(liquidityUsd > 0)) return null;

  let best: { side: "buy" | "sell"; wallets: number; usd: number } | null = null;
  for (const side of ["buy", "sell"] as const) {
    const recent = trades.filter(
      (t) => t.side === side && now - t.at >= 0 && now - t.at <= CLUSTER_WINDOW_MS,
    );
    const wallets = new Set(recent.map((t) => t.wallet)).size;
    const usd = recent.reduce((n, t) => n + t.usd, 0);
    if (wallets < CLUSTER_MIN_WALLETS) continue;
    if (!best || usd > best.usd) best = { side, wallets, usd };
  }
  if (!best) return null;

  const value = Number(((best.usd / liquidityUsd) * 100).toFixed(1));
  if (value < 1) return null;

  const buy = best.side === "buy";
  const verb = buy ? "bought" : "sold";
  const mins = Math.round(CLUSTER_WINDOW_MS / 60_000);
  return {
    kind: "WHALE_CLUSTER",
    severity: buy ? "info" : value >= 20 ? "critical" : "warning",
    title: `${best.wallets} wallets ${verb} ${money(best.usd)} in ${mins} min`,
    detail: `${best.wallets} different wallets ${verb} ${money(best.usd)} combined in ${mins} minutes, ${value}% of the pool's liquidity.`,
    value,
    key: `cluster-${best.side}`,
  };
}
