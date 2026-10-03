import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import type { HealthFactor } from "./types";
import { scoreLiquidityRatio, scoreLiquidityUsd } from "./liquidity";
import { scoreTape1h, scoreTape5m } from "./tape";
import { scoreFlow } from "./flow";
import {
  scoreAuthorityPair,
  scoreTopHolderConcentration,
} from "./structure";

function availableFactor(
  key: string,
  label: string,
  group: HealthFactor["group"],
  normalized: {
    score: number;
    explanation: string;
  },
  unit: string,
): HealthFactor {
  return {
    key,
    label,
    group,
    status: "AVAILABLE",
    value: normalized.score,
    unit,
    explanation: normalized.explanation,
  };
}

function unavailableFactor(
  key: string,
  label: string,
  group: HealthFactor["group"],
  explanation: string,
): HealthFactor {
  return {
    key,
    label,
    group,
    status: "N/A",
    value: null,
    unit: null,
    explanation,
  };
}

export function assembleHealthFactors(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
): HealthFactor[] {
  const factors: HealthFactor[] = [];

  const tape5m = scoreTape5m(market.periods.m5.priceChangePct);

  factors.push(
    tape5m
      ? availableFactor(
          "tape_5m",
          "5m price stability",
          "TAPE",
          tape5m,
          "score",
        )
      : unavailableFactor(
          "tape_5m",
          "5m price stability",
          "TAPE",
          "5m price change is unavailable.",
        ),
  );

  const tape1h = scoreTape1h(market.periods.h1.priceChangePct);

  factors.push(
    tape1h
      ? availableFactor(
          "tape_1h",
          "1h price stability",
          "TAPE",
          tape1h,
          "score",
        )
      : unavailableFactor(
          "tape_1h",
          "1h price stability",
          "TAPE",
          "1h price change is unavailable.",
        ),
  );

  const liquidityUsd = scoreLiquidityUsd(market.liquidityUsd);

  factors.push(
    liquidityUsd
      ? availableFactor(
          "liquidity_usd",
          "Absolute liquidity",
          "LIQUIDITY",
          liquidityUsd,
          "score",
        )
      : unavailableFactor(
          "liquidity_usd",
          "Absolute liquidity",
          "LIQUIDITY",
          "USD liquidity is unavailable.",
        ),
  );

  const liquidityRatio = scoreLiquidityRatio(
    market.liquidityUsd,
    market.marketCapUsd,
  );

  factors.push(
    liquidityRatio
      ? availableFactor(
          "liquidity_ratio",
          "Liquidity / market cap",
          "LIQUIDITY",
          liquidityRatio,
          "score",
        )
      : unavailableFactor(
          "liquidity_ratio",
          "Liquidity / market cap",
          "LIQUIDITY",
          "Liquidity-to-market-cap ratio is unavailable.",
        ),
  );

  const flow = scoreFlow(
    market.periods.h1.buys,
    market.periods.h1.sells,
    "1h",
  );

  factors.push(
    flow
      ? availableFactor("flow", "1h buy/sell flow", "FLOW", flow, "score")
      : unavailableFactor(
          "flow",
          "1h buy/sell flow",
          "FLOW",
          "1h buy/sell counts are unavailable or too few to judge.",
        ),
  );

  const authority = scoreAuthorityPair(
    identity.mintAuthority,
    identity.freezeAuthority,
  );

  factors.push(
    authority
      ? availableFactor(
          "structure_authorities",
          "Mint / freeze authority",
          "STRUCTURE",
          authority,
          "score",
        )
      : unavailableFactor(
          "structure_authorities",
          "Mint / freeze authority",
          "STRUCTURE",
          "Mint and freeze authority observations are unavailable.",
        ),
  );

  const topHolder = scoreTopHolderConcentration(
    identity.topHolderPct,
  );

  factors.push(
    topHolder
      ? availableFactor(
          "structure_top_holder",
          "Top-holder concentration",
          "STRUCTURE",
          topHolder,
          "score",
        )
      : unavailableFactor(
          "structure_top_holder",
          "Top-holder concentration",
          "STRUCTURE",
          "Top-holder concentration is unavailable.",
        ),
  );

  return factors;
}
