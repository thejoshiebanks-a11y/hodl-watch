export type AuthorityStatus = "SET" | "REVOKED" | "UNKNOWN";

export type TokenHolder = {
  address: string;
  owner: string | null;
  pct: number;
  insider: boolean | null;
  knownType: string | null;
};

export type TokenIdentitySnapshot = {
  mint: string;
  mintAuthority: AuthorityStatus;
  freezeAuthority: AuthorityStatus;
  creator: string | null;
  topHolderPct: number | null;
  topHolderPctExcludingKnown: number | null;
  topHolders: TokenHolder[];
  holderCount: number | null;
  creatorBalance: number | null;
  rugged: boolean | null;
  launchpad: string | null;
  tokenDetectedAt: string | null;
  jupVerified: boolean | null;
  insiderHolderCount: number | null;
  insiderNetworkCount: number | null;
  insiderSupplyPct: number | null;
  lpLockedPctWeighted: number | null;
  lpLockedUsd: number | null;
  poolCount: number | null;
  poolLiquidityUsd: number | null;
  largestPoolLockedPct: number | null;
  transferFeePct: number | null;
  observedAt: string;
  provider: string;
};
