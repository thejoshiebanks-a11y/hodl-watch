import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import type { HealthFactor, HealthGroup } from "./types";
import type { NormalizedFactor } from "./tape";
import type { Candle } from "@/lib/types/chart";
import { scoreDrawdown, scoreRecovery, scoreVolatility } from "./candles";
import { scoreLiquidityRatio, scoreLiquidityUsd } from "./liquidity";
import { scoreTape1h, scoreTape5m } from "./tape";
import { scoreFlow } from "./flow";
import {
  scoreAuthorityPair,
  scoreTopHolderConcentration,
} from "./structure";
import {
  scoreActivity,
  scoreAge,
  scoreCreatorAllocation,
  scoreHolderCount,
  scoreInsiderSupply,
  scoreJupiter,
  scoreLpLock,
  scorePriceImpact,
  scoreRugged,
  scoreStability,
  scoreTop10ExcludingKnown,
  scoreTransferFee,
  scoreVolumeToLiquidity,
} from "./extra";

function add(
  list: HealthFactor[],
  key: string,
  label: string,
  group: HealthGroup,
  n: NormalizedFactor | null,
  missing: string,
) {
  list.push(
    n
      ? {
          key,
          label,
          group,
          status: "AVAILABLE",
          value: n.score,
          unit: "score",
          explanation: n.explanation,
        }
      : {
          key,
          label,
          group,
          status: "N/A",
          value: null,
          unit: null,
          explanation: missing,
        },
  );
}

export function assembleHealthFactors(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
  candles?: Candle[] | null,
): HealthFactor[] {
  const f: HealthFactor[] = [];
  const p = market.periods;

  // MARKET
  add(f, "market_5m", "5m price stability", "MARKET", scoreTape5m(p.m5.priceChangePct), "5m price change is unavailable.");
  add(f, "market_1h", "1h price stability", "MARKET", scoreTape1h(p.h1.priceChangePct), "1h price change is unavailable.");
  add(f, "market_6h", "6h price stability", "MARKET", scoreStability(p.h6.priceChangePct, "6h"), "6h price change is unavailable.");
  add(f, "market_24h", "24h price stability", "MARKET", scoreStability(p.h24.priceChangePct, "24h"), "24h price change is unavailable.");

  // MARKET (from candles). Skipped entirely when the caller passes no candle argument.
  if (candles !== undefined) {
    add(f, "market_drawdown", "Drawdown from 24h high", "MARKET", scoreDrawdown(candles), "Candle data is unavailable.");
    add(f, "market_volatility", "Volatility (15m candles)", "MARKET", scoreVolatility(candles), "Candle data is unavailable.");
    add(f, "market_recovery", "Recovery from 24h low", "MARKET", scoreRecovery(candles), "Candle data is unavailable.");
  }

  // LIQUIDITY
  add(f, "liquidity_usd", "Absolute liquidity", "LIQUIDITY", scoreLiquidityUsd(market.liquidityUsd), "USD liquidity is unavailable.");
  add(f, "liquidity_ratio", "Liquidity / market cap", "LIQUIDITY", scoreLiquidityRatio(market.liquidityUsd, market.marketCapUsd), "Liquidity-to-market-cap ratio is unavailable.");
  add(f, "liquidity_turnover", "24h volume / liquidity", "LIQUIDITY", scoreVolumeToLiquidity(p.h24.volumeUsd, market.liquidityUsd), "Volume or liquidity is unavailable.");
  add(f, "liquidity_lp_lock", "LP locked", "LIQUIDITY", scoreLpLock(identity.lpLockedPctWeighted), "LP lock data is unavailable.");
  add(f, "liquidity_impact", "Price impact ($1k buy)", "LIQUIDITY", scorePriceImpact(market.liquidityUsd), "USD liquidity is unavailable.");

  // FLOW (1h, falling back to 6h when 1h is too thin)
  const flow1h = scoreFlow(p.h1.buys, p.h1.sells, "1h");
  const flow6h = flow1h ? null : scoreFlow(p.h6.buys, p.h6.sells, "6h");
  const flow: NormalizedFactor | null = flow1h
    ? flow1h
    : flow6h
      ? { ...flow6h, explanation: `1h too thin, using 6h. ${flow6h.explanation}` }
      : null;
  add(f, "flow", "Buy/sell flow (1h, 6h fallback)", "FLOW", flow, "Buy/sell counts are too few to judge in 1h and 6h.");
  add(f, "flow_24h", "24h buy/sell flow", "FLOW", scoreFlow(p.h24.buys, p.h24.sells, "24h"), "24h buy/sell counts are unavailable or too few.");
  add(f, "flow_activity", "Trading activity (24h)", "FLOW", scoreActivity(p.h24.buys, p.h24.sells), "24h transaction counts are unavailable.");

  // HOLDERS
  add(f, "holders_top", "Top-holder concentration (excl. pools)", "HOLDERS", scoreTopHolderConcentration(identity.topHolderPctExcludingKnown ?? identity.topHolderPct), "Top-holder data is unavailable.");
  add(f, "holders_top10", "Top 10 non-pool holders", "HOLDERS", scoreTop10ExcludingKnown(identity.topHolders), "Holder list is unavailable.");
  add(f, "holders_count", "Holder count", "HOLDERS", scoreHolderCount(identity.holderCount), "Holder count is unavailable.");
  add(f, "holders_insiders", "Insider supply", "HOLDERS", scoreInsiderSupply(identity.insiderSupplyPct), "Insider data is unavailable.");

  // CREATOR
  add(f, "creator_rugged", "Rugged flag", "CREATOR", scoreRugged(identity.rugged), "Rugged status is unavailable.");
  add(f, "creator_allocation", "Creator allocation", "CREATOR", scoreCreatorAllocation(identity.creator, identity.topHolders), "Creator or holder list is unavailable.");

  // SECURITY
  add(f, "security_authorities", "Mint / freeze authority", "SECURITY", scoreAuthorityPair(identity.mintAuthority, identity.freezeAuthority), "Authority observations are unavailable.");
  add(f, "security_transfer_fee", "Transfer fee", "SECURITY", scoreTransferFee(identity.transferFeePct), "Transfer fee data is unavailable.");
  add(f, "security_jupiter", "Jupiter verification", "SECURITY", scoreJupiter(identity.jupVerified), "Jupiter verification is unavailable.");

  // LIFECYCLE
  add(f, "lifecycle_token_age", "Token age", "LIFECYCLE", scoreAge(identity.tokenDetectedAt, market.observedAt, "Token"), "Token detection time is unavailable.");
  add(f, "lifecycle_pair_age", "Pool age", "LIFECYCLE", scoreAge(market.pairCreatedAt, market.observedAt, "Pool"), "Pool creation time is unavailable.");

  return f;
}
