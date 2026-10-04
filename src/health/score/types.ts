export type HealthScore = {
  score: number | null;
  coverage: number;
  version: "health-v0.1.2";
  scoredFactors: number;
  availableFactors: number;
  partial: boolean;
  missingCritical: boolean; // Security or Liquidity not observed
  explanation: string;
};
