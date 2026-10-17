export type WalletRole = "creator" | "top_holder" | "kol" | "unknown";
export type Level = "info" | "warning" | "critical";

export type WhaleTrade = {
  signature: string;
  mint: string;
  wallet: string;
  side: "buy" | "sell";
  usd: number;
  tokenAmount: number;
  ts: number;
};

export type TokenContext = {
  liquidityUsd: number | null;
  supply: number | null;
  creator?: string | null;
  topHolders?: string[];
  kolWallets?: Record<string, string>;
};

export type Significance = {
  role: WalletRole;
  label?: string;
  pctOfLiquidity: number | null;
  pctOfSupply: number | null;
  level: Level;
};

export function classifyWallet(
  wallet: string,
  ctx: TokenContext,
): { role: WalletRole; label?: string } {
  if (ctx.creator && wallet === ctx.creator) return { role: "creator" };
  if (ctx.topHolders?.includes(wallet)) return { role: "top_holder" };
  const kol = ctx.kolWallets?.[wallet];
  if (kol) return { role: "kol", label: kol };
  return { role: "unknown" };
}

const pct = (n: number, d: number | null) =>
  d && d > 0 ? (n / d) * 100 : null;

export function assessTrade(t: WhaleTrade, ctx: TokenContext): Significance {
  const { role, label } = classifyWallet(t.wallet, ctx);
  const pctOfLiquidity = pct(t.usd, ctx.liquidityUsd);
  const pctOfSupply = pct(t.tokenAmount, ctx.supply);
  const liq = pctOfLiquidity ?? 0;
  const sup = pctOfSupply ?? 0;

  let level: Level = "info";
  if (t.side === "sell") {
    const insider = role === "creator" || role === "top_holder";
    if (insider && (sup >= 1 || liq >= 10)) level = "critical";
    else if (insider || sup >= 2 || liq >= 5) level = "warning";
  } else if (liq >= 10 || sup >= 2) {
    level = "warning";
  }
  return { role, label, pctOfLiquidity, pctOfSupply, level };
}
