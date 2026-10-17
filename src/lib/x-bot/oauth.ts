import { createHmac, randomBytes } from "node:crypto";

export type OAuthCreds = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
};

/** RFC 3986 percent-encoding, as OAuth 1.0a requires. */
export function pct(s: string): string {
  return encodeURIComponent(s).replace(
    /[!*()']/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Signs a request. `params` holds every oauth_* and query parameter (not a JSON body). */
export function signRequest(o: {
  method: string;
  url: string;
  params: Record<string, string>;
  consumerSecret: string;
  tokenSecret: string;
}): string {
  const normalized = Object.entries(o.params)
    .map(([k, v]) => [pct(k), pct(v)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const base = [o.method.toUpperCase(), pct(o.url), pct(normalized)].join("&");
  const key = `${pct(o.consumerSecret)}&${pct(o.tokenSecret)}`;
  return createHmac("sha1", key).update(base).digest("base64");
}

/** Builds the Authorization header for one request. */
export function authHeader(o: {
  method: string;
  url: string;
  query?: Record<string, string>;
  creds: OAuthCreds;
  nonce?: string;
  timestamp?: string;
}): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: o.creds.apiKey,
    oauth_nonce: o.nonce ?? randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: o.timestamp ?? String(Math.floor(Date.now() / 1000)),
    oauth_token: o.creds.accessToken,
    oauth_version: "1.0",
  };
  const oauth_signature = signRequest({
    method: o.method,
    url: o.url,
    params: { ...(o.query ?? {}), ...oauth },
    consumerSecret: o.creds.apiSecret,
    tokenSecret: o.creds.accessSecret,
  });
  const all = { ...oauth, oauth_signature };
  return (
    "OAuth " +
    Object.keys(all)
      .sort()
      .map((k) => `${pct(k)}="${pct(all[k as keyof typeof all])}"`)
      .join(", ")
  );
}
