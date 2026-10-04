export type HealthFactorStatus = "AVAILABLE" | "N/A";

export type HealthGroup =
  | "MARKET"
  | "LIQUIDITY"
  | "FLOW"
  | "HOLDERS"
  | "CREATOR"
  | "SECURITY"
  | "LIFECYCLE";

export type HealthFactor = {
  key: string;
  label: string;
  group: HealthGroup;
  status: HealthFactorStatus;
  value: number | null;
  unit: string | null;
  explanation: string;
};

export type HealthObservationSet = {
  factors: HealthFactor[];
  observedAt: string;
};
