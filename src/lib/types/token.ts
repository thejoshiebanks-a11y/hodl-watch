export type TokenMarketSnapshot = {
  mint: string;
  symbol: string | null;
  name: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceChange5mPct: number | null;
  priceChange1hPct: number | null;
  pairAddress: string | null;
  dexId: string | null;
  quoteSymbol: string | null;
  observedAt: string;
  provider: "dexscreener";
};
