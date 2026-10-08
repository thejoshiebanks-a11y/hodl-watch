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
      imageUrl: z.string().nullable().optional(),
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

async function getDexScreenerRaw(
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
    // Wrapped SOL's supply is not SOL's circulating supply, so its cap and FDV would be wrong.
    marketCapUsd: mint === "So11111111111111111111111111111111111111112" ? null : (pair.marketCap ?? null),
    fdvUsd: mint === "So11111111111111111111111111111111111111112" ? null : (pair.fdv ?? null),

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
    imageUrl: pair.info?.imageUrl ?? null,

    observedAt: new Date().toISOString(),
    provider: "dexscreener",
  };
}


// ---------- GeckoTerminal fallback ----------
type GeckoPool = {
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: string } | null } | undefined>;
};
type GeckoIncluded = { id?: string; attributes?: Record<string, unknown> };

function gnum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function gperiod(a: Record<string, unknown>, key: "m5" | "h1" | "h6" | "h24"): TokenMarketPeriod {
  const tx = ((a.transactions as Record<string, { buys?: unknown; sells?: unknown }> | undefined) ?? {})[key];
  const vol = (a.volume_usd as Record<string, unknown> | undefined) ?? {};
  const chg = (a.price_change_percentage as Record<string, unknown> | undefined) ?? {};
  return {
    buys: gnum(tx?.buys),
    sells: gnum(tx?.sells),
    volumeUsd: gnum(vol[key]),
    priceChangePct: gnum(chg[key]),
  };
}

async function getGeckoSnapshot(mint: string): Promise<TokenMarketSnapshot | null> {
  const response = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1&include=base_token`,
    {
      headers: { Accept: "application/json;version=20230302" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error(`GeckoTerminal request failed: ${response.status}`);

  const json = (await response.json()) as { data?: GeckoPool[]; included?: GeckoIncluded[] };
  const pool = (json.data ?? [])
    .filter((p) => p.relationships?.base_token?.data?.id === `solana_${mint}`)
    .sort((a, b) => (gnum(b.attributes?.reserve_in_usd) ?? 0) - (gnum(a.attributes?.reserve_in_usd) ?? 0))[0];
  if (!pool || !pool.attributes) return null;

  const a = pool.attributes;
  const token = (json.included ?? []).find((i) => i.id === `solana_${mint}`)?.attributes;
  const parts = String(a.name ?? "").split(" / ");
  const symbol = (token?.symbol as string | undefined) ?? (parts[0] || null);
  const image = token?.image_url as string | undefined;

  return {
    mint,
    symbol: symbol ?? null,
    name: (token?.name as string | undefined) ?? symbol ?? null,
    priceUsd: gnum(a.base_token_price_usd),
    marketCapUsd: gnum(a.market_cap_usd),
    fdvUsd: gnum(a.fdv_usd),
    liquidityUsd: gnum(a.reserve_in_usd),
    liquidityBase: null,
    liquidityQuote: null,
    pairAddress: (a.address as string | undefined) ?? null,
    dexId: pool.relationships?.dex?.data?.id ?? null,
    quoteSymbol: parts[1] ? parts[1].trim().split(" ")[0] : null,
    pairCreatedAt: a.pool_created_at ? new Date(String(a.pool_created_at)).toISOString() : null,
    periods: {
      m5: gperiod(a, "m5"),
      h1: gperiod(a, "h1"),
      h6: gperiod(a, "h6"),
      h24: gperiod(a, "h24"),
    },
    websites: [],
    socials: [],
    activeBoosts: null,
    imageUrl: image && image !== "missing.png" ? image : null,
    observedAt: new Date().toISOString(),
    provider: "geckoterminal",
  };
}

export async function getDexScreenerSnapshot(
  mint: string,
): Promise<TokenMarketSnapshot | null> {
  let dexError: unknown = null;
  try {
    const snap = await getDexScreenerRaw(mint);
    if (snap) {
      const img = await getGeckoImage(mint);
      return { ...snap, imageUrl: img ?? snap.imageUrl ?? null };
    }
  } catch (e) {
    dexError = e;
  }
  try {
    const gecko = await getGeckoSnapshot(mint);
    if (gecko) return gecko;
  } catch (e) {
    throw dexError ?? e;
  }
  if (dexError) throw dexError;
  return null;
}


// GeckoTerminal is the primary source for token profile images.
async function getGeckoImage(mint: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`,
      {
        headers: { Accept: "application/json;version=20230302" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { attributes?: { image_url?: unknown } };
    };
    const url = json.data?.attributes?.image_url;
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}
