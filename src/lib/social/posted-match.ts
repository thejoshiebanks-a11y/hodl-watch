import type { XPost } from "./x";

export type PostedCa =
  | { state: "YES"; handle: string; url: string }
  | { state: "NOT_SEEN"; handle: string }
  | {
      state: "UNKNOWN";
      reason: "no_x_account" | "no_token" | "budget" | "x_error" | "no_scan";
      handle?: string;
    };

// First path pieces on x.com that are not accounts.
const RESERVED = new Set([
  "i", "home", "search", "intent", "share", "hashtag", "explore",
  "settings", "messages", "notifications", "compose",
]);

/** The token's own X account, taken from its linked social URLs. */
export function xHandleFrom(socials: { handle?: string | null }[]): string | null {
  for (const s of socials) {
    const m = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/i.exec(
      (s.handle ?? "").trim(),
    );
    if (m && !RESERVED.has(m[1].toLowerCase())) return m[1];
  }
  return null;
}

/** A post counts only if it is from that account and contains the exact mint. */
export function findPost(posts: XPost[], handle: string, mint: string): XPost | null {
  const h = handle.toLowerCase();
  return (
    posts.find(
      (p) => p.username?.toLowerCase() === h && [p.text, ...p.urls].join(" ").includes(mint),
    ) ?? null
  );
}
