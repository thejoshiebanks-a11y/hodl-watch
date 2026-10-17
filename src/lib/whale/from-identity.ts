import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { StoredWhaleContext } from "./context";

/**
 * Picks out what whale alerts need from a scan: the creator, the top-holder
 * wallets and the total supply. Returns null when there is nothing useful.
 */
export function buildWhaleContext(
  identity: Pick<TokenIdentitySnapshot, "creator" | "topHolders" | "supplyUi">,
): StoredWhaleContext | null {
  const holders = new Set<string>();
  for (const h of identity.topHolders ?? []) {
    // Traders are wallets (owners), not token accounts. Skip pools,
    // exchanges and other known accounts.
    if (h.owner && h.knownType === null) holders.add(h.owner);
  }

  const supply =
    typeof identity.supplyUi === "number" &&
    Number.isFinite(identity.supplyUi) &&
    identity.supplyUi > 0
      ? identity.supplyUi
      : null;
  const creator = identity.creator || null;

  if (supply === null && creator === null && holders.size === 0) return null;
  return { supply, creator, topHolders: [...holders] };
}
