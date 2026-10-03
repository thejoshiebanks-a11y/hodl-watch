import { z } from "zod";
import type {
  TokenMarketPeriod,
  TokenMarketSnapshot,
  TokenSocial,
  TokenWebsite,
} from "@/lib/types/token";

const DexPeriodSchema = z.object({
  buys: z.number().nullable().optional(),
  sells: z.number().nullable().optional(),
  volume: z.number().nullable().optional(),
});

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
  fdv: z.number().nullable().optional(),

  liquidity: z
    .object({
      usd: z.number().nullable().optional(),
      base: z.number().nullable().optional(),
      quote: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),

  volume: z
    .object({
      m5: z.number().nullable().optional(),
      h1: z.number().nullable().optional(),
      h6: z.number().nullable().optional(),
      h24: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),

  txns: z
    .object({
      m5: DexPeriodSchema.nullable().optional(),
      h1: DexPeriodSchema.nullable().optional(),
      h6: DexPeriodSchema.nullable().optional(),
      h24: DexPeriodSchema.nullable().optional(),
    })
    .nullable()
    .optional(),

  priceChange: z
    .object({
      m5: z.number().nullable().optional(),
      h1: z.number().nullable().optional(),
      h6: z.number().nullable().optional(),
      h24: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),

  pairCreatedAt: z.number().nullable().optional(),

  info: z
    .object({
      websites: z
        .array(
          z.object({
            label: z.string().nullable().optional(),
            url: z.string(),
          }),
        )
        .nullable()
        .optional(),

      socials: z
        .array(
          z.object({
            type: z.string(),
            url: z.string(),
          }),
        )
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),

  boosts: z
    .object({
      active: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const DexResponseSchema = z.array(z.unknown());

function period(
  pair: z.infer<typeof DexPairSchema>,
  key: "m5" | "h1" | "h6" | "h24",
): TokenMarketPeriod {
  const transactions = pair.txns?.[key];
  const volume = pair.volume?.[key];

  return {
    buys: transactions?.buys ?? null,
    sells: transactions?.sells ?? null,
    volumeUsd: volume ?? null,
    priceChangePct: pair.priceChange?.[key] ?? null,
  };
}

function parseSocials(
  pair: z.infer<typeof DexPairSchema>,
): TokenSocial[] {
  return (
    pair.info?.socials?.map((social) => ({
      platform: social.type,
      handle: social.url,
    })) ?? []
  );
}

function parseWebsites(
  pair: z.infer<typeof DexPairSchema>,
): TokenWebsite[] {
  return (
    pair.info?.websites?.map((website) => ({
      url: website.url,
    })) ?? []
  );
}

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
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`DexScreener request failed: ${response.status}`);
  }

  const parsed = DexResponseSchema.parse(await response.json()).flatMap(
    (item) => {
      const result = DexPairSchema.safeParse(item);
      return result.success ? [result.data] : [];
    },
  );

  const pair = parsed
    .filter(
      (item) =>
        item.chainId === "solana" &&
        item.baseToken.address === mint,
    )
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
    fdvUsd: pair.fdv ?? null,

    liquidityUsd: pair.liquidity?.usd ?? null,
    liquidityBase: pair.liquidity?.base ?? null,
    liquidityQuote: pair.liquidity?.quote ?? null,

    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    quoteSymbol: pair.quoteToken.symbol ?? null,

    pairCreatedAt:
      pair.pairCreatedAt !== null &&
      pair.pairCreatedAt !== undefined
        ? new Date(pair.pairCreatedAt).toISOString()
        : null,

    periods: {
      m5: period(pair, "m5"),
      h1: period(pair, "h1"),
      h6: period(pair, "h6"),
      h24: period(pair, "h24"),
    },

    websites: parseWebsites(pair),
    socials: parseSocials(pair),
    activeBoosts: pair.boosts?.active ?? null,

    observedAt: new Date().toISOString(),
    provider: "dexscreener",
  };
}
