import { authHeader, type OAuthCreds } from "./oauth";
import { xLength, MAX_REPLY } from "./reply";

export const TWEETS_URL = "https://api.x.com/2/tweets";

export type PostFailure =
  | "invalid"
  | "unauthorized"
  | "forbidden"
  | "duplicate"
  | "rate_limited"
  | "no_credits"
  | "error";

export type PostResult =
  | { ok: true; dryRun: true; text: string }
  | { ok: true; dryRun: false; id: string }
  | { ok: false; status: number; reason: PostFailure };

type Env = Record<string, string | undefined>;

/** All four bot keys, or null if any is missing. */
export function loadCreds(env: Env = process.env): OAuthCreds | null {
  const apiKey = env.X_BOT_API_KEY;
  const apiSecret = env.X_BOT_API_SECRET;
  const accessToken = env.X_BOT_ACCESS_TOKEN;
  const accessSecret = env.X_BOT_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

/** The bot only posts when this is exactly "true". Anything else is dry-run. */
export function isLive(env: Env = process.env): boolean {
  return env.X_BOT_LIVE === "true";
}

const TWEET_ID = /^\d{1,25}$/;

export async function postReply(o: {
  text: string;
  inReplyTo: string;
  creds: OAuthCreds | null;
  live: boolean;
  fetchImpl?: typeof fetch;
  nonce?: string;
  timestamp?: string;
}): Promise<PostResult> {
  const text = o.text.trim();
  if (text.length === 0 || xLength(text) > MAX_REPLY || !TWEET_ID.test(o.inReplyTo)) {
    return { ok: false, status: 0, reason: "invalid" };
  }

  // Dry-run unless explicitly live AND fully configured.
  if (!o.live || !o.creds) return { ok: true, dryRun: true, text };

  const res = await (o.fetchImpl ?? fetch)(TWEETS_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader({
        method: "POST",
        url: TWEETS_URL,
        creds: o.creds,
        nonce: o.nonce,
        timestamp: o.timestamp,
      }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: o.inReplyTo } }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (res.ok) {
    const json = (await res.json().catch(() => null)) as { data?: { id?: unknown } } | null;
    const id = json?.data?.id;
    return typeof id === "string"
      ? { ok: true, dryRun: false, id }
      : { ok: false, status: res.status, reason: "error" };
  }

  if (res.status === 401) return { ok: false, status: 401, reason: "unauthorized" };
  if (res.status === 402) return { ok: false, status: 402, reason: "no_credits" };
  if (res.status === 429) return { ok: false, status: 429, reason: "rate_limited" };
  if (res.status === 403) {
    const body = (await res.text().catch(() => "")).toLowerCase();
    return {
      ok: false,
      status: 403,
      reason: body.includes("duplicate") ? "duplicate" : "forbidden",
    };
  }
  return { ok: false, status: res.status, reason: "error" };
}
