import { z } from "zod";
import type { TokenMarketSnapshot } from "@/lib/types/token";

const DexPairSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  pairAddress: z.string(),
  baseToken: z.object({
    address: z.string(),
    name: z.string().nullable().optional(),
    symbol: z.string().nullable().optional(),
  }),
  quoteToken: z.object({
    symbol: z.string().nullable().optional(),
  }),
  priceUsd: z.string().nullable().optional(),
  marketCap: z.number().nullable().optional(),
  liquidity: z
    .object({
      usd: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  volume: z
    .object({
      h24: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  priceChange: z
    .object({
      m5: z.number().nullable().optional(),
      h1: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const DexResponseSchema = z.array(DexPairSchema);

export async function getDexScreenerSnapshot(
  mint: string,
): Promise<TokenMarketSnapshot | null> {
  const response = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`DexScreener request failed: ${response.status}`);
  }

  const parsed = DexResponseSchema.parse(await response.json());

  const pair = parsed
    .filter((item) => item.chainId === "solana")
    .sort(
      (a, b) =>
        (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0];

  if (!pair) {
    return null;
  }

  const priceUsd = pair.priceUsd ? Number(pair.priceUsd) : null;

  return {
    mint,
    symbol: pair.baseToken.symbol ?? null,
    name: pair.baseToken.name ?? null,
    priceUsd: Number.isFinite(priceUsd ?? NaN) ? priceUsd : null,
    marketCapUsd: pair.marketCap ?? null,
    liquidityUsd: pair.liquidity?.usd ?? null,
    volume24hUsd: pair.volume?.h24 ?? null,
    priceChange5mPct: pair.priceChange?.m5 ?? null,
    priceChange1hPct: pair.priceChange?.h1 ?? null,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    quoteSymbol: pair.quoteToken.symbol ?? null,
    observedAt: new Date().toISOString(),
    provider: "dexscreener",
  };
}
