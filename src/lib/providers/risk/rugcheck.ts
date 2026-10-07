import { z } from "zod";
import type {
  AuthorityStatus,
  TokenHolder,
  TokenIdentitySnapshot,
} from "@/lib/types/identity";

const RugcheckHolderSchema = z.object({
  address: z.string(),
  owner: z.string().nullable().optional(),
  pct: z.number(),
  insider: z.boolean().nullable().optional(),
});

const RugcheckKnownAccountSchema = z.object({
  name: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
});

const RugcheckMarketSchema = z.object({
  marketType: z.string().nullable().optional(),
  lp: z
    .object({
      baseUSD: z.number().nullable().optional(),
      quoteUSD: z.number().nullable().optional(),
      lpLockedPct: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const RugcheckInsiderNetworkSchema = z.object({
  currentHolding: z.number().nullable().optional(),
});

const RugcheckResponseSchema = z.object({
  creator: z.string().nullable().optional(),
  creatorBalance: z.number().nullable().optional(),
  rugged: z.boolean().nullable().optional(),

  mintAuthority: z.string().nullable().optional(),
  freezeAuthority: z.string().nullable().optional(),

  token: z
    .object({
      mintAuthority: z.string().nullable().optional(),
      freezeAuthority: z.string().nullable().optional(),
      supply: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),

  topHolders: z.array(RugcheckHolderSchema).nullable().optional(),
  knownAccounts: z
    .record(z.string(), RugcheckKnownAccountSchema)
    .nullable()
    .optional(),

  totalHolders: z.number().nullable().optional(),
  graphInsidersDetected: z.number().nullable().optional(),
  insiderNetworks: z
    .array(RugcheckInsiderNetworkSchema)
    .nullable()
    .optional(),
  markets: z.array(RugcheckMarketSchema).nullable().optional(),

  launchpad: z
    .object({
      platform: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),

  detectedAt: z.string().nullable().optional(),

  verification: z
    .object({
      jup_verified: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),

  transferFee: z
    .object({
      pct: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),

  totalMarketLiquidity: z.unknown().optional(),

  risks: z
    .array(
      z.object({
        name: z.string().nullable().optional(),
        level: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

function authorityStatus(
  authority: string | null | undefined,
): AuthorityStatus {
  if (authority === null) {
    return "REVOKED";
  }

  if (typeof authority === "string" && authority.length > 0) {
    return "SET";
  }

  return "UNKNOWN";
}

function isoOrNull(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export async function getRugcheckIdentity(
  mint: string,
): Promise<TokenIdentitySnapshot> {
  const response = await fetch(
    `https://api.rugcheck.xyz/v1/tokens/${mint}/report`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`Rugcheck request failed: ${response.status}`);
  }

  const parsed = RugcheckResponseSchema.parse(await response.json());

  const mintAuthority =
    parsed.mintAuthority ?? parsed.token?.mintAuthority;

  const freezeAuthority =
    parsed.freezeAuthority ?? parsed.token?.freezeAuthority;

  const known = parsed.knownAccounts ?? {};

  const topHolders: TokenHolder[] = (parsed.topHolders ?? [])
    .slice(0, 10)
    .map((holder) => {
      const match =
        (holder.owner ? known[holder.owner] : undefined) ??
        known[holder.address];

      return {
        address: holder.address,
        owner: holder.owner ?? null,
        pct: holder.pct,
        insider: holder.insider ?? null,
        knownType: match?.type ?? null,
      };
    });

  const topHolderPct =
    parsed.topHolders && parsed.topHolders.length > 0
      ? parsed.topHolders[0].pct
      : null;

  const firstNonKnown = topHolders.find(
    (holder) => holder.knownType === null,
  );

  const pools = (parsed.markets ?? []).map((market) => ({
    usd: (market.lp?.baseUSD ?? 0) + (market.lp?.quoteUSD ?? 0),
    lockedPct: market.lp?.lpLockedPct ?? null,
  }));

  const poolLiquidityUsd = pools.reduce((sum, pool) => sum + pool.usd, 0);

  const lpLockedUsd = pools.reduce(
    (sum, pool) => sum + ((pool.lockedPct ?? 0) / 100) * pool.usd,
    0,
  );

  const largestPool = [...pools].sort((a, b) => b.usd - a.usd)[0];

  const supply = parsed.token?.supply ?? null;

  const insiderHolding = (parsed.insiderNetworks ?? []).reduce(
    (sum, network) => sum + (network.currentHolding ?? 0),
    0,
  );

  return {
    mint,
    mintAuthority: authorityStatus(mintAuthority),
    freezeAuthority: authorityStatus(freezeAuthority),
    creator: parsed.creator ?? null,
    topHolderPct,
    topHolderPctExcludingKnown: firstNonKnown?.pct ?? null,
    topHolders,
    holderCount: parsed.totalHolders ?? null,
    creatorBalance: parsed.creatorBalance ?? null,
    rugged: parsed.rugged ?? null,
    launchpad: parsed.launchpad?.platform ?? parsed.launchpad?.name ?? null,
    tokenDetectedAt: isoOrNull(parsed.detectedAt),
    jupVerified: parsed.verification?.jup_verified ?? null,
    insiderHolderCount: parsed.graphInsidersDetected ?? null,
    transferFeePct: parsed.transferFee?.pct ?? null,
    totalMarketLiquidityUsd: ((v: unknown) => {
      const n = typeof v === "string" ? Number(v) : v;
      return typeof n === "number" && Number.isFinite(n) ? n : null;
    })(parsed.totalMarketLiquidity),
    riskFlags: parsed.risks
      ? parsed.risks.flatMap((r) =>
          r.name ? [{ name: r.name, level: r.level ?? "info" }] : [],
        )
      : null,
    insiderNetworkCount: parsed.insiderNetworks
      ? parsed.insiderNetworks.length
      : null,
    insiderSupplyPct:
      parsed.insiderNetworks && supply !== null && supply > 0
        ? (insiderHolding / supply) * 100
        : null,
    lpLockedPctWeighted:
      pools.length > 0 && poolLiquidityUsd > 0
        ? (lpLockedUsd / poolLiquidityUsd) * 100
        : null,
    lpLockedUsd: pools.length > 0 ? lpLockedUsd : null,
    poolCount: parsed.markets ? pools.length : null,
    poolLiquidityUsd: pools.length > 0 ? poolLiquidityUsd : null,
    largestPoolLockedPct: largestPool?.lockedPct ?? null,
    observedAt: new Date().toISOString(),
    provider: "rugcheck",
  };
}
