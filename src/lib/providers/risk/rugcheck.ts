import { z } from "zod";
import type {
  AuthorityStatus,
  TokenIdentitySnapshot,
} from "@/lib/types/identity";

const RugcheckHolderSchema = z.object({
  address: z.string(),
  pct: z.number(),
});

const RugcheckResponseSchema = z.object({
  creator: z.string().nullable().optional(),

  mintAuthority: z.string().nullable().optional(),
  freezeAuthority: z.string().nullable().optional(),

  token: z
    .object({
      mintAuthority: z.string().nullable().optional(),
      freezeAuthority: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),

  topHolders: z
    .array(RugcheckHolderSchema)
    .nullable()
    .optional(),

  totalHolders: z.number().nullable().optional(),
});

function authorityStatus(
  authority: string | null | undefined,
): AuthorityStatus {
  if (authority === null) {
    return "REVOKED";
  }

  if (typeof authority === "string" && authority.length > 0) {
    return "SET";
  }

  return "UNKNOWN";
}

export async function getRugcheckIdentity(
  mint: string,
): Promise<TokenIdentitySnapshot> {
  const response = await fetch(
    `https://api.rugcheck.xyz/v1/tokens/${mint}/report`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Rugcheck request failed: ${response.status}`);
  }

  const parsed = RugcheckResponseSchema.parse(await response.json());

  const mintAuthority =
    parsed.mintAuthority ?? parsed.token?.mintAuthority;

  const freezeAuthority =
    parsed.freezeAuthority ?? parsed.token?.freezeAuthority;

  const topHolderPct =
    parsed.topHolders && parsed.topHolders.length > 0
      ? parsed.topHolders[0].pct
      : null;

  return {
    mint,
    mintAuthority: authorityStatus(mintAuthority),
    freezeAuthority: authorityStatus(freezeAuthority),
    creator: parsed.creator ?? null,
    topHolderPct,
    holderCount: parsed.totalHolders ?? null,
    observedAt: new Date().toISOString(),
    provider: "rugcheck",
  };
}
