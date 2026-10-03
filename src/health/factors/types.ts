export type HealthFactorStatus = "AVAILABLE" | "N/A";

export type HealthFactor = {
  key: string;
  label: string;
  group: "TAPE" | "LIQUIDITY" | "FLOW" | "STRUCTURE";
  status: HealthFactorStatus;
  value: number | null;
  unit: string | null;
  explanation: string;
};

export type HealthObservationSet = {
  factors: HealthFactor[];
  observedAt: string;
};
