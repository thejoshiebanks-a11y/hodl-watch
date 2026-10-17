const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

/** Finds posts that mention the bot, excluding the bot's own posts and retweets. */
export function buildMentionQuery(handle: string): string {
  const h = handle.replace(/^@/, "");
  if (!HANDLE.test(h)) throw new Error("invalid bot handle");
  return `@${h} -from:${h} -is:retweet`;
}

export function dayStamp(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Reads a whole-number setting from the environment, clamped to a safe range. */
export function intEnv(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || raw === undefined || raw === "") return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Compares X post ids (digit strings too big for a JS number). */
export function compareIds(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}
