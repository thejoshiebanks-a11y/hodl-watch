export type TokenSocial = {
  platform: string;
  handle: string;
};

export type TokenWebsite = {
  url: string;
};

export type TokenMarketPeriod = {
  buys: number | null;
  sells: number | null;
  volumeUsd: number | null;
  priceChangePct: number | null;
};

export type TokenMarketSnapshot = {
  imageUrl?: string | null;
  mint: string;
  symbol: string | null;
  name: string | null;

  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;

  liquidityUsd: number | null;
  liquidityBase: number | null;
  liquidityQuote: number | null;
  /** True for pump.fun tokens that have not graduated to a pool. */
  bondingCurve?: boolean;
  liquiditySource?: "dexscreener" | "rugcheck_curve";

  pairAddress: string | null;
  dexId: string | null;
  quoteSymbol: string | null;
  pairCreatedAt: string | null;

  periods: {
    m5: TokenMarketPeriod;
    h1: TokenMarketPeriod;
    h6: TokenMarketPeriod;
    h24: TokenMarketPeriod;
  };

  websites: TokenWebsite[];
  socials: TokenSocial[];
  activeBoosts: number | null;

  observedAt: string;
  provider: "dexscreener" | "geckoterminal";
};
