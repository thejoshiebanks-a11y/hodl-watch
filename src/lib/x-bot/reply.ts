import type { ScanSuccess } from "../types/scan";
import { money } from "../whale/logic";

export type Authority = "SET" | "REVOKED" | "UNKNOWN";

export type ReplyInput = {
  symbol: string | null;
  score: number | null;
  scored: number;
  available: number;
  partial: boolean;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  mintAuthority: Authority;
  freezeAuthority: Authority;
  topHolderPct: number | null;
  lpLockedPct: number | null;
};

export const MAX_REPLY = 280;

/** Token symbols come from the chain. Keep only safe characters. */
export function safeSymbol(raw: string | null): string | null {
  const s = (raw ?? "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 12);
  return s.length > 0 ? s : null;
}

const authority = (a: Authority) =>
  a === "REVOKED" ? "revoked" : a === "SET" ? "set" : "N/A";
const usd = (n: number | null) => (n === null ? "N/A" : money(n));
const pct = (n: number | null) => (n === null ? "N/A" : `${n.toFixed(1)}%`);

export function toReplyInput(data: ScanSuccess["data"]): ReplyInput {
  return {
    symbol: data.market.symbol,
    score: data.health.score,
    scored: data.health.scoredFactors,
    available: data.health.availableFactors,
    partial: data.health.partial || data.health.missingCritical,
    liquidityUsd: data.market.liquidityUsd,
    marketCapUsd: data.market.marketCapUsd,
    mintAuthority: data.identity.mintAuthority,
    freezeAuthority: data.identity.freezeAuthority,
    topHolderPct: data.identity.topHolderPct,
    lpLockedPct: data.identity.lpLockedPctWeighted,
  };
}

/** Plain text, no links, no @ mentions. Optional lines drop first if too long. */
export function formatReply(input: ReplyInput, maxLen = MAX_REPLY): string {
  const sym = safeSymbol(input.symbol);
  const score = input.score === null ? "N/A" : `${input.score.toFixed(1)}/10`;
  const head =
    `${sym ? `$${sym}` : "This token"} Health ${score}` +
    (input.partial ? " (partial data)" : "");

  const optional = [
    `${input.scored}/${input.available} checks observed`,
    `Liquidity ${usd(input.liquidityUsd)} · MC ${usd(input.marketCapUsd)}`,
    `Mint auth: ${authority(input.mintAuthority)} · Freeze auth: ${authority(input.freezeAuthority)}`,
    `Top holder: ${pct(input.topHolderPct)} · LP locked: ${pct(input.lpLockedPct)}`,
  ];
  const tail = "Not financial advice.";

  const build = () => [head, ...optional, tail].join("\n");
  while (build().length > maxLen && optional.length > 0) optional.pop();
  return build();
}

export function notFoundReply(): string {
  return "I couldn't find a market for that address. Check the contract address and try again.\n\nNot financial advice.";
}
