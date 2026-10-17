import { describe, it, expect } from "vitest";
import { pct, signRequest, authHeader } from "./oauth";
import { postReply, loadCreds, isLive, TWEETS_URL } from "./post";

const creds = {
  apiKey: "key",
  apiSecret: "secret",
  accessToken: "token",
  accessSecret: "tokensecret",
};

describe("oauth signing", () => {
  it("matches X's documented example signature", () => {
    const sig = signRequest({
      method: "POST",
      url: "https://api.twitter.com/1.1/statuses/update.json",
      params: {
        status: "Hello Ladies + Gentlemen, a signed OAuth request!",
        include_entities: "true",
        oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog",
        oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1318622958",
        oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
        oauth_version: "1.0",
      },
      consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
      tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
    });
    expect(sig).toBe("hCtSmYh+iHYCEqBWrE7C7hYmtUk=");
  });

  it("percent-encodes the way OAuth requires", () => {
    expect(pct("Ladies + Gentlemen")).toBe("Ladies%20%2B%20Gentlemen");
    expect(pct("!*()'")).toBe("%21%2A%28%29%27");
    expect(pct("a-b_c.d~e")).toBe("a-b_c.d~e");
  });

  it("builds a sorted header with a signature", () => {
    const h = authHeader({
      method: "POST",
      url: TWEETS_URL,
      creds,
      nonce: "abc",
      timestamp: "1700000000",
    });
    expect(h.startsWith("OAuth oauth_consumer_key=\"key\", oauth_nonce=\"abc\"")).toBe(true);
    expect(h).toContain('oauth_token="token"');
    expect(h).toContain('oauth_version="1.0"');
    expect(h).toMatch(/oauth_signature="[^"]+"/);
    expect(h).not.toContain("secret");
  });

  it("signs different requests differently", () => {
    const a = authHeader({ method: "POST", url: TWEETS_URL, creds, nonce: "n", timestamp: "1" });
    const b = authHeader({ method: "POST", url: TWEETS_URL + "?x=1", creds, nonce: "n", timestamp: "1" });
    expect(a).not.toBe(b);
  });
});

describe("config", () => {
  it("loads creds only when all four exist", () => {
    expect(loadCreds({})).toBeNull();
    expect(loadCreds({ X_BOT_API_KEY: "a", X_BOT_API_SECRET: "b", X_BOT_ACCESS_TOKEN: "c" })).toBeNull();
    expect(
      loadCreds({
        X_BOT_API_KEY: "a",
        X_BOT_API_SECRET: "b",
        X_BOT_ACCESS_TOKEN: "c",
        X_BOT_ACCESS_SECRET: "d",
      }),
    ).toEqual({ apiKey: "a", apiSecret: "b", accessToken: "c", accessSecret: "d" });
  });

  it("is live only when exactly true", () => {
    expect(isLive({})).toBe(false);
    expect(isLive({ X_BOT_LIVE: "1" })).toBe(false);
    expect(isLive({ X_BOT_LIVE: "TRUE" })).toBe(false);
    expect(isLive({ X_BOT_LIVE: "true" })).toBe(true);
  });
});

describe("postReply", () => {
  const never: typeof fetch = () => {
    throw new Error("fetch must not be called");
  };

  it("dry-run: does not call X", async () => {
    const r = await postReply({ text: "hi", inReplyTo: "123", creds, live: false, fetchImpl: never });
    expect(r).toEqual({ ok: true, dryRun: true, text: "hi" });
  });

  it("dry-run when keys are missing even if live is on", async () => {
    const r = await postReply({ text: "hi", inReplyTo: "123", creds: null, live: true, fetchImpl: never });
    expect(r).toEqual({ ok: true, dryRun: true, text: "hi" });
  });

  it("refuses bad input before anything else", async () => {
    for (const bad of [
      { text: "", inReplyTo: "123" },
      { text: "hi", inReplyTo: "12a" },
      { text: "hi", inReplyTo: "" },
      { text: "x".repeat(281), inReplyTo: "123" },
    ]) {
      const r = await postReply({ ...bad, creds, live: true, fetchImpl: never });
      expect(r).toMatchObject({ ok: false, reason: "invalid" });
    }
  });

  it("live: posts a reply with the right request", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fake: typeof fetch = async (url, init) => {
      seen = { url: String(url), init: init as RequestInit };
      return new Response(JSON.stringify({ data: { id: "999", text: "hi" } }), { status: 201 });
    };
    const r = await postReply({
      text: "hi",
      inReplyTo: "123",
      creds,
      live: true,
      fetchImpl: fake,
      nonce: "n",
      timestamp: "1",
    });
    expect(r).toEqual({ ok: true, dryRun: false, id: "999" });
    expect(seen!.url).toBe(TWEETS_URL);
    expect(seen!.init.method).toBe("POST");
    expect(JSON.parse(String(seen!.init.body))).toEqual({
      text: "hi",
      reply: { in_reply_to_tweet_id: "123" },
    });
    const headers = seen!.init.headers as Record<string, string>;
    expect(headers.Authorization.startsWith("OAuth ")).toBe(true);
  });

  it("maps X errors", async () => {
    const respond = (status: number, body = "{}") => async () =>
      new Response(body, { status });
    const go = (f: typeof fetch) =>
      postReply({ text: "hi", inReplyTo: "123", creds, live: true, fetchImpl: f });

    expect(await go(respond(401))).toMatchObject({ ok: false, reason: "unauthorized" });
    expect(await go(respond(429))).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(await go(respond(403, '{"detail":"You are not allowed to create a Tweet with duplicate content."}'))).toMatchObject({ ok: false, reason: "duplicate" });
    expect(await go(respond(403))).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await go(respond(500))).toMatchObject({ ok: false, reason: "error" });
  });
});
