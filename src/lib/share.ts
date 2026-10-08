import { SolanaMintSchema } from "@/lib/validation/solana";
import { getScanCached } from "@/lib/scan/cache";

const DEFAULT_URL = "https://hodlterminal.vercel.app";

/** The public address of the site, from HODL_PUBLIC_URL when it is set. */
export function siteUrl(): string {
  const raw = process.env.HODL_PUBLIC_URL?.trim() || DEFAULT_URL;
  const full = (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");
  try {
    new URL(full);
    return full;
  } catch {
    return DEFAULT_URL;
  }
}

// Display bands only. They match the token view and do not change the Health score.
export function bandOf(s: number | null): string {
  if (s === null) return "UNSCORED";
  return s >= 7.5 ? "HEALTHY" : s >= 5.5 ? "MIXED" : s >= 3.5 ? "WEAK" : "POOR";
}

export function bandColorOf(s: number | null): string {
  return s === null ? "#64748b" : s >= 7.5 ? "#2dd4bf" : s >= 5.5 ? "#fbbf24" : "#fb7185";
}

export type ShareInfo = {
  mint: string;
  symbol: string | null;
  name: string | null;
  score: number | null;
  partial: boolean;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
};

export async function shareInfo(mint: string): Promise<ShareInfo | null> {
  const parsed = SolanaMintSchema.safeParse(mint);
  if (!parsed.success) return null;
  try {
    const outcome = await getScanCached(parsed.data);
    if (!outcome.ok) return null;
    const { market, health } = outcome.data;
    return {
      mint: parsed.data,
      symbol: market.symbol,
      name: market.name,
      score: health.score,
      partial: health.partial || health.missingCritical,
      marketCapUsd: market.marketCapUsd,
      liquidityUsd: market.liquidityUsd,
    };
  } catch {
    return null;
  }
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function describeShare(info: ShareInfo | null): { title: string; description: string } {
  if (!info) {
    return {
      title: "HODL | Solana token intelligence",
      description: "Scan any Solana token for an explainable Health score, a live chart and the evidence behind it.",
    };
  }
  const tag = info.symbol ? `$${info.symbol}` : (info.name ?? "Token");
  const title =
    info.score === null ? `${tag} · HODL` : `${tag} · Health ${info.score.toFixed(1)}/10 · HODL`;
  const parts: string[] = [
    info.score === null
      ? "Health score not available yet."
      : `Health score ${info.score.toFixed(1)}/10 (${bandOf(info.score).toLowerCase()})${info.partial ? ", based on partial data" : ""}.`,
  ];
  if (info.marketCapUsd !== null) parts.push(`Market cap $${compact.format(info.marketCapUsd)}.`);
  if (info.liquidityUsd !== null) parts.push(`Liquidity $${compact.format(info.liquidityUsd)}.`);
  parts.push("Observed data, not financial advice.");
  return { title, description: parts.join(" ") };
}
