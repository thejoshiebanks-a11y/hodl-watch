// X (Twitter) provider adapter: finds posts from tracked accounts that mention watched tokens.
// Pure functions + one fetch wrapper, so it can be tested with mocked responses.

export type TrackedToken = { mint: string; symbol: string | null };

export type XPost = {
  id: string;
  text: string;
  createdAt: string;
  authorId: string | null;
  username: string | null;
  name: string | null;
  urls: string[];
};

/** verified = the exact mint address appears. possible = only the $SYMBOL appears (symbols are not unique). */
export type MentionLevel = "verified" | "possible";

export type MentionMatch = {
  mint: string;
  symbol: string | null;
  level: MentionLevel;
  post: XPost;
  url: string;
};

export class XApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "XApiError";
    this.status = status;
  }
}

const MAX_QUERY = 500; // X allows 512 characters on pay-per-use
const SUFFIX = " -is:retweet";
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const SYMBOL_RE = /^[A-Za-z0-9_]{1,15}$/;
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function pack(items: string[], maxLen: number): string[][] {
  const groups: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const it of items) {
    if (cur.length > 0 && len + 4 + it.length > maxLen) {
      groups.push(cur);
      cur = [];
      len = 0;
    }
    len += (cur.length > 0 ? 4 : 0) + it.length; // " OR "
    cur.push(it);
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}

/**
 * Builds the search queries: (tracked handles) AND (watched mints / $symbols).
 * Only matching posts come back, and X bills per post returned.
 */
export function buildQueries(
  handles: string[],
  tokens: TrackedToken[],
  opts: { cashtags?: boolean; maxQueries?: number } = {},
): string[] {
  const cashtags = opts.cashtags ?? true;
  const maxQueries = opts.maxQueries ?? 24;

  const hs = [...new Set(handles.map((h) => h.replace(/^@/, "")).filter((h) => HANDLE_RE.test(h)))].map(
    (h) => `from:${h}`,
  );

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const t of tokens) {
    if (MINT_RE.test(t.mint) && !seen.has(t.mint)) {
      seen.add(t.mint);
      terms.push(t.mint);
    }
    if (cashtags && t.symbol && SYMBOL_RE.test(t.symbol)) {
      const tag = `$${t.symbol}`;
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        terms.push(tag);
      }
    }
  }
  if (hs.length === 0 || terms.length === 0) return [];

  const out: string[] = [];
  for (const hg of pack(hs, 200)) {
    const handlePart = `(${hg.join(" OR ")})`;
    const budget = MAX_QUERY - SUFFIX.length - handlePart.length - 3; // space + two parentheses
    for (const tg of pack(terms, budget)) {
      out.push(`${handlePart} (${tg.join(" OR ")})${SUFFIX}`);
    }
  }
  return out.slice(0, maxQueries);
}

type RawPost = {
  id?: string;
  text?: string;
  created_at?: string;
  author_id?: string;
  entities?: { urls?: { expanded_url?: string; unwound_url?: string }[] };
};
type RawUser = { id?: string; username?: string; name?: string };

export function parseSearch(json: unknown): { posts: XPost[]; newestId: string | null } {
  const j = (json ?? {}) as {
    data?: RawPost[];
    includes?: { users?: RawUser[] };
    meta?: { newest_id?: string };
  };
  const users = new Map<string, RawUser>();
  for (const u of j.includes?.users ?? []) if (u?.id) users.set(u.id, u);

  const posts: XPost[] = [];
  for (const p of j.data ?? []) {
    if (!p || typeof p.id !== "string" || typeof p.text !== "string") continue;
    const author = p.author_id ? users.get(p.author_id) : undefined;
    const urls = (p.entities?.urls ?? [])
      .flatMap((u) => [u.expanded_url, u.unwound_url])
      .filter((u): u is string => typeof u === "string");
    posts.push({
      id: p.id,
      text: p.text,
      createdAt: typeof p.created_at === "string" ? p.created_at : new Date(0).toISOString(),
      authorId: p.author_id ?? null,
      username: author?.username ?? null,
      name: author?.name ?? null,
      urls,
    });
  }
  return { posts, newestId: j.meta?.newest_id ?? null };
}

export async function searchRecent(
  query: string,
  o: { bearer: string; sinceId?: string | null; startTime?: string; maxResults?: number; fetchImpl?: typeof fetch },
): Promise<{ posts: XPost[]; newestId: string | null }> {
  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(100, Math.max(10, o.maxResults ?? 100))),
    "tweet.fields": "created_at,author_id,entities",
    expansions: "author_id",
    "user.fields": "username,name",
  });

  if (o.sinceId) params.set("since_id", o.sinceId);
  else if (o.startTime) params.set("start_time", o.startTime);

  const res = await (o.fetchImpl ?? fetch)(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${o.bearer}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new XApiError(res.status, `X search failed: ${res.status}`);
  return parseSearch(await res.json());
}

function hasCashtag(text: string, symbol: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_])\\$${symbol}(?![A-Za-z0-9_])`, "i").test(text);
}

export function postUrl(post: XPost): string {
  return post.username
    ? `https://x.com/${post.username}/status/${post.id}`
    : `https://x.com/i/status/${post.id}`;
}

/** Which watched tokens does this post mention, and how sure are we? */
export function classifyPost(post: XPost, tokens: TrackedToken[]): MentionMatch[] {
  const haystack = [post.text, ...post.urls].join(" ");
  const out: MentionMatch[] = [];
  for (const t of tokens) {
    if (t.mint && haystack.includes(t.mint)) {
      out.push({ mint: t.mint, symbol: t.symbol, level: "verified", post, url: postUrl(post) });
    } else if (t.symbol && SYMBOL_RE.test(t.symbol) && hasCashtag(post.text, t.symbol)) {
      out.push({ mint: t.mint, symbol: t.symbol, level: "possible", post, url: postUrl(post) });
    }
  }
  return out;
}

export function isFresh(post: XPost, now: number, maxAgeMs: number): boolean {
  const t = Date.parse(post.createdAt);
  return Number.isFinite(t) && now - t <= maxAgeMs && t <= now + 60_000;
}
