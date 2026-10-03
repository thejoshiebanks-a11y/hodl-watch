export type AuthorityStatus = "SET" | "REVOKED" | "UNKNOWN";

export type TokenIdentitySnapshot = {
  mint: string;
  mintAuthority: AuthorityStatus;
  freezeAuthority: AuthorityStatus;
  creator: string | null;
  topHolderPct: number | null;
  holderCount: number | null;
  observedAt: string;
  provider: string;
};
