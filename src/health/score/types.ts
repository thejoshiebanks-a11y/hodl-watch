export type HealthScore = {
  score: number | null;
  coverage: number;
  version: "health-v0.1";
  scoredFactors: number;
  availableFactors: number;
  explanation: string;
};
