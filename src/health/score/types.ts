import type { HealthCap } from "./caps";

export type HealthScore = {
  score: number | null;
  coverage: number;
  version: "health-v0.3.0";
  scoredFactors: number;
  availableFactors: number;
  partial: boolean;
  missingCritical: boolean; // Security or Liquidity not observed
  explanation: string;
  uncappedScore?: number | null;
  caps?: HealthCap[];
};
