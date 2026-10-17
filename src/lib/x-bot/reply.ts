import type { ScanSuccess } from "../types/scan";
import { money } from "../whale/logic";

export type Authority = "SET" | "REVOKED" | "UNKNOWN";
export type Verdict = "HEALTHY" | "MIXED" | "WEAK" | "POOR";

export type ReplyInput = {
  symbol: string | null;
  score: number | null;
  scored: number;
  available: number;
  partial: boolean;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  ageHours: number | null;
  mintAuthority: Authority;
  freezeAuthority: Authority;
  lpLockedPct: number | null;
  topHolderPct: number | null;
  holderCount: number | null;
  insiderSupplyPct: number | null;
  change24hPct: number | null;
  volume24hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  flags: string[];
};

export const MAX_REPLY = 280;
const URL_LEN = 23; // X counts every link as 23 characters

/** Same thresholds as the app (see /methodology). */
export function verdict(score: number | null): Verdict | null {
  if (score === null) return null;
  return score >= 7.5 ? "HEALTHY" : score >= 5.5 ? "MIXED" : score >= 3.5 ? "WEAK" : "POOR";
}

/** Token symbols come from the chain. Keep only safe characters. */
export function safeSymbol(raw: string | null): string | null {
  const s = (raw ?? "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 12);
  return s.length > 0 ? s : null;
}

/** Provider flag names are text we don't control: no dots, slashes or @. */
export function safeFlag(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9 %-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
}

export function xLength(text: string): number {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(URL_LEN)).length;
}

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function reportUrl(mint: string, site: string): string | null {
  if (!MINT.test(mint) || !site.startsWith("https://")) return null;
  return `${site.replace(/\/+$/, "")}/t/${mint}`;
}

const authority = (a: Authority) =>
  a === "REVOKED" ? "revoked" : a === "SET" ? "set" : "N/A";
const usd = (n: number | null) => (n === null ? "N/A" : money(n));
const pct = (n: number | null) => (n === null ? "N/A" : `${n.toFixed(1)}%`);
const signed = (n: number | null) =>
  n === null ? "N/A" : `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;

function compact(n: number | null): string {
  if (n === null) return "N/A";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function age(hours: number | null): string {
  if (hours === null || hours < 0) return "N/A";
  if (hours < 1) return "<1h";
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

const LEVEL_RANK: Record<string, number> = { danger: 2, warn: 1 };

export function toReplyInput(data: ScanSuccess["data"]): ReplyInput {
  const { market, identity, health } = data;
  const created = market.pairCreatedAt ? Date.parse(market.pairCreatedAt) : NaN;
  const seen = Date.parse(market.observedAt);
  const ageHours =
    Number.isFinite(created) && Number.isFinite(seen)
      ? Math.max(0, (seen - created) / 3_600_000)
      : null;

  const flags = [
    ...new Set(
      (identity.riskFlags ?? [])
        .filter((f) => (LEVEL_RANK[f.level] ?? 0) > 0)
        .sort((a, b) => (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0))
        .map((f) => safeFlag(f.name))
        .filter((f) => f.length > 0),
    ),
  ].slice(0, 2);

  const h24 = market.periods.h24;
  return {
    symbol: market.symbol,
    score: health.score,
    scored: health.scoredFactors,
    available: health.availableFactors,
    partial: health.partial || health.missingCritical,
    liquidityUsd: market.liquidityUsd,
    marketCapUsd: market.marketCapUsd,
    ageHours,
    mintAuthority: identity.mintAuthority,
    freezeAuthority: identity.freezeAuthority,
    lpLockedPct: identity.lpLockedPctWeighted,
    topHolderPct: identity.topHolderPct,
    holderCount: identity.holderCount,
    insiderSupplyPct: identity.insiderSupplyPct,
    change24hPct: h24.priceChangePct,
    volume24hUsd: h24.volumeUsd,
    buys24h: h24.buys,
    sells24h: h24.sells,
    flags,
  };
}

/**
 * Plain text, no @ mentions. A link is only added when one is passed in.
 * Lines drop from the bottom when the reply is too long.
 */
export function formatReply(
  input: ReplyInput,
  opts: { maxLen?: number; link?: string | null } = {},
): string {
  const maxLen = opts.maxLen ?? MAX_REPLY;
  const sym = safeSymbol(input.symbol);
  const v = verdict(input.score);
  const score = input.score === null ? "N/A" : `${input.score.toFixed(1)}/10`;
  const head =
    `${sym ? `$${sym}` : "This token"} Health ${score}${v ? ` ${v}` : ""}` +
    ` (${input.scored}/${input.available} checks${input.partial ? ", partial data" : ""})`;

  const optional = [
    `Liq ${usd(input.liquidityUsd)} · MC ${usd(input.marketCapUsd)} · Age ${age(input.ageHours)}`,
    `Mint ${authority(input.mintAuthority)} · Freeze ${authority(input.freezeAuthority)} · LP locked ${pct(input.lpLockedPct)}`,
    `Top holder ${pct(input.topHolderPct)} · Holders ${compact(input.holderCount)} · Insiders ${pct(input.insiderSupplyPct)}`,
    ...(input.flags.length > 0 ? [`Flags: ${input.flags.join(", ")}`] : []),
    `24h ${signed(input.change24hPct)} · Vol ${usd(input.volume24hUsd)} · Buys/Sells ${compact(input.buys24h)}/${compact(input.sells24h)}`,
  ];
  const linkLine = opts.link ? [`Full report: ${opts.link}`] : [];
  const tail = "Not financial advice.";

  const build = () => [head, ...optional, ...linkLine, tail].join("\n");
  while (xLength(build()) > maxLen && optional.length > 0) optional.pop();
  return build();
}

export function notFoundReply(): string {
  return "I couldn't find a market for that address. Check the contract address and try again.\n\nNot financial advice.";
}
