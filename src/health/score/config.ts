export const HEALTH_VERSION = "health-v0.1.2" as const;

export const HEALTH_GROUP_WEIGHTS = {
  MARKET: 0.15,
  LIQUIDITY: 0.25,
  FLOW: 0.15,
  HOLDERS: 0.15,
  CREATOR: 0.1,
  SECURITY: 0.15,
  LIFECYCLE: 0.05,
} as const;

// Below this share of checks observed, the UI should label Health "Partial".
export const PARTIAL_COVERAGE_BELOW = 0.6;
