import type { XPost } from "@/lib/social/x";
import { extractMints } from "../x/extractMint";

export type Mention =
  | { ok: true; mint: string; postId: string; userId: string; username: string | null }
  | { ok: false; reason: "self" | "no_author" | "not_addressed" | "no_mint" };

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

/**
 * Decides whether a post is a real request to the bot, and for which token.
 * Only the first mint in the post is used.
 */
export function parseMention(post: XPost, botHandle: string): Mention {
  const handle = botHandle.replace(/^@/, "");
  if (!HANDLE.test(handle)) throw new Error("invalid bot handle");

  if (!post.authorId) return { ok: false, reason: "no_author" };
  if (post.username?.toLowerCase() === handle.toLowerCase()) {
    return { ok: false, reason: "self" }; // never answer our own posts
  }

  const addressed = new RegExp(
    `(^|[^A-Za-z0-9_])@${handle}(?![A-Za-z0-9_])`,
    "i",
  ).test(post.text);
  if (!addressed) return { ok: false, reason: "not_addressed" };

  const [mint] = extractMints(post.text);
  if (!mint) return { ok: false, reason: "no_mint" };

  return {
    ok: true,
    mint,
    postId: post.id,
    userId: post.authorId,
    username: post.username,
  };
}
