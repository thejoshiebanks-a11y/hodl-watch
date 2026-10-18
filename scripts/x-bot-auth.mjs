// One-time helper: gets access tokens for the bot account through YOUR app.
// Run it from the repo root:  node scripts/x-bot-auth.mjs
// Nothing is saved to disk. Copy the printed values into Vercel, never into git.
import { createHmac, randomBytes } from "node:crypto";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

export const pct = (s) =>
  encodeURIComponent(s).replace(/[!*()']/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export function sign(method, url, params, consumerSecret, tokenSecret = "") {
  const normalized = Object.entries(params)
    .map(([k, v]) => [pct(k), pct(v)])
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const base = [method.toUpperCase(), pct(url), pct(normalized)].join("&");
  return createHmac("sha1", `${pct(consumerSecret)}&${pct(tokenSecret)}`).update(base).digest("base64");
}

export function header({ method, url, key, secret, token = "", tokenSecret = "", extra = {}, nonce, timestamp }) {
  const oauth = {
    oauth_consumer_key: key,
    oauth_nonce: nonce ?? randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp ?? String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...(token ? { oauth_token: token } : {}),
    ...extra,
  };
  const all = { ...oauth, oauth_signature: sign(method, url, oauth, secret, tokenSecret) };
  return "OAuth " + Object.keys(all).sort().map((k) => `${pct(k)}="${pct(all[k])}"`).join(", ");
}

/** Accepts a PIN, or the full address X redirected to (which contains oauth_verifier=...). */
export function extractVerifier(input) {
  const text = String(input ?? "").trim();
  const m = text.match(/[?&#]oauth_verifier=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{4,64}$/.test(text) ? text : null;
}

export function parseForm(body) {
  return Object.fromEntries(new URLSearchParams(body));
}

async function post(hosts, path, args) {
  let last = "no response";
  for (const host of hosts) {
    const url = `https://${host}${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: header({ method: "POST", url, ...args }) },
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      if (res.ok) return { host, data: parseForm(text) };
      last = `${host}: HTTP ${res.status} ${text.slice(0, 200)}`;
    } catch (e) {
      last = `${host}: ${e.message}`;
    }
  }
  throw new Error(last);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const HOSTS = ["api.x.com", "api.twitter.com"];

  console.log("\nHODLbot token helper. Use your APP's keys (not the bot's login).\n");
  const key = (await rl.question("API key: ")).trim();
  const secret = (await rl.question("API secret: ")).trim();
  const cb = (await rl.question("Callback URL registered on the app (Enter = PIN mode): ")).trim() || "oob";

  const req = await post(HOSTS, "/oauth/request_token", { key, secret, extra: { oauth_callback: cb } });
  const { oauth_token, oauth_token_secret } = req.data;
  if (!oauth_token || !oauth_token_secret) throw new Error("No request token returned.");

  console.log("\nSTEP A. Open this link in a browser where you are logged in as the BOT account");
  console.log("(use a private tab, or log out of your personal account first):\n");
  console.log(`https://${req.host}/oauth/authorize?oauth_token=${oauth_token}\n`);
  console.log("Tap Authorize app.");
  console.log(cb === "oob"
    ? "You will see a PIN. Copy it."
    : "The browser then goes to your callback address. The page may be blank or an error, that is fine.\nCopy the FULL address from the address bar.");

  const verifier = extractVerifier(await rl.question("\nPaste the PIN or the full address here: "));
  rl.close();
  if (!verifier) throw new Error("Could not find a PIN or oauth_verifier in that text.");

  const acc = await post([req.host], "/oauth/access_token", {
    key,
    secret,
    token: oauth_token,
    tokenSecret: oauth_token_secret,
    extra: { oauth_verifier: verifier },
  });
  const a = acc.data;
  console.log(`\nAuthorized account: @${a.screen_name}`);
  if (String(a.screen_name).toLowerCase() !== "hodlb0t") {
    console.log("\nSTOP. This is NOT @HODLB0T. Do not use these tokens. Log in as the bot and run again.");
    return;
  }
  console.log("\nAdd these four to Vercel (Production). Never commit them:\n");
  console.log(`X_BOT_API_KEY=${key}`);
  console.log(`X_BOT_API_SECRET=${secret}`);
  console.log(`X_BOT_ACCESS_TOKEN=${a.oauth_token}`);
  console.log(`X_BOT_ACCESS_SECRET=${a.oauth_token_secret}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error("\nFailed:", e.message);
    process.exit(1);
  });
}
