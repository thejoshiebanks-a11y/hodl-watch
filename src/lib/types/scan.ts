import type { HealthFactor } from "@/health/factors/types";
import type { HealthScore } from "@/health/score/types";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";

export type ScanSuccess = {
  data: {
    market: TokenMarketSnapshot;
    identity: TokenIdentitySnapshot;
    health: HealthScore;
    factors: HealthFactor[];
  };
};

export type ScanError = {
  error: string;
  code:
    | "INVALID_MINT"
    | "TOKEN_NOT_FOUND"
    | "SCAN_FAILED"
    | "RATE_LIMITED";
};

export type ScanResponse = ScanSuccess | ScanError;
