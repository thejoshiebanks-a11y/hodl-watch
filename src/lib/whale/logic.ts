import type { WatchEvent } from "@/lib/watch/detect";
import type { WalletRole } from "./significance";

export type Swap = {
  side: "buy" | "sell";
  usd: number;
  wallet: string;
};

/** Who the trader is, when we know. Optional, so old callers keep working. */
export type WhaleContext = {
  role?: WalletRole;
  pctOfSupply?: number | null;
};

/** Trades smaller than this are never whale trades, however tiny the pool. */
export const MIN_WHALE_USD = 500;

const ROLE_NAME: Record<WalletRole, string> = {
  creator: "Creator wallet",
  top_holder: "Top holder",
  kol: "Reported KOL wallet",
  unknown: "Whale",
};

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
 * the same rule works for a $5K pool and a $5M pool. When the trader is a
 * known insider, a sell is escalated.
 */
export function whaleEvent(
  swap: Swap,
  liquidityUsd: number | null,
  ctx: WhaleContext = {},
): WatchEvent | null {
  if (!Number.isFinite(swap.usd) || swap.usd < MIN_WHALE_USD) return null;
  if (typeof liquidityUsd !== "number" || !(liquidityUsd > 0)) return null;

  const value = Number(((swap.usd / liquidityUsd) * 100).toFixed(1));
  if (value < 1) return null;

  const role = ctx.role ?? "unknown";
  const insider = role === "creator" || role === "top_holder";
  const supply =
    typeof ctx.pctOfSupply === "number" && ctx.pctOfSupply >= 0.1
      ? Number(ctx.pctOfSupply.toFixed(2))
      : null;

  const buy = swap.side === "buy";
  const verb = buy ? "bought" : "sold";
  const critical =
    value >= 20 || (insider && (value >= 10 || (supply ?? 0) >= 1));

  return {
    kind: buy ? "WHALE_BUY" : "WHALE_SELL",
    severity: buy ? "info" : critical ? "critical" : "warning",
    title: `${ROLE_NAME[role]} ${verb} ${money(swap.usd)}`,
    detail:
      `${shortWallet(swap.wallet)} ${verb} ${money(swap.usd)} in one trade, ${value}% of the pool's liquidity` +
      (supply !== null ? `, ${supply}% of supply.` : "."),
    value,
  };
}
