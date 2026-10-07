import type { WatchEvent } from "@/lib/watch/detect";

export type Swap = {
  side: "buy" | "sell";
  usd: number;
  wallet: string;
};

/** Trades smaller than this are never whale trades, however tiny the pool. */
export const MIN_WHALE_USD = 500;

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function shortWallet(w: string): string {
  return w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}

/**
 * Turns one swap into an alert, sized as a share of the pool's liquidity so
 * the same rule works for a $5K pool and a $5M pool.
 */
export function whaleEvent(
  swap: Swap,
  liquidityUsd: number | null,
): WatchEvent | null {
  if (!Number.isFinite(swap.usd) || swap.usd < MIN_WHALE_USD) return null;
  if (typeof liquidityUsd !== "number" || !(liquidityUsd > 0)) return null;

  const value = Number(((swap.usd / liquidityUsd) * 100).toFixed(1));
  if (value < 1) return null;

  const buy = swap.side === "buy";
  const verb = buy ? "bought" : "sold";
  return {
    kind: buy ? "WHALE_BUY" : "WHALE_SELL",
    severity: buy ? "info" : value >= 20 ? "critical" : "warning",
    title: `Whale ${verb} ${money(swap.usd)}`,
    detail: `${shortWallet(swap.wallet)} ${verb} ${money(swap.usd)} in one trade, ${value}% of the pool's liquidity.`,
    value,
  };
}
