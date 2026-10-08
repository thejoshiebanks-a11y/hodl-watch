import { describe, expect, it } from "vitest";
import { buildQueries, classifyPost, isFresh, parseSearch, type XPost } from "./x";

const SOL = "So11111111111111111111111111111111111111112";

const post = (text: string, extra: Partial<XPost> = {}): XPost => ({
  id: "1",
  text,
  createdAt: new Date().toISOString(),
  authorId: "9",
  username: "someone",
  name: "Some One",
  urls: [],
  ...extra,
});

describe("buildQueries", () => {
  it("returns nothing without handles or tokens", () => {
    expect(buildQueries([], [{ mint: SOL, symbol: "SOL" }])).toEqual([]);
    expect(buildQueries(["a"], [])).toEqual([]);
  });

  it("drops retweets and stays under the length limit", () => {
    const handles = Array.from({ length: 40 }, (_, i) => `account_${i}`);
    const tokens = Array.from({ length: 30 }, (_, i) => ({ mint: SOL.slice(0, 40) + String(100 + i), symbol: `TK${i}` }));
    const qs = buildQueries(handles, tokens);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.length).toBeLessThanOrEqual(512);
      expect(q.endsWith(" -is:retweet")).toBe(true);
    }
  });

  it("leaves out $symbols when cashtags are off", () => {
    const [q] = buildQueries(["a"], [{ mint: SOL, symbol: "SOL" }], { cashtags: false });
    expect(q).toContain(SOL);
    expect(q).not.toContain("$");
  });

  it("ignores handles that are not valid", () => {
    const [q] = buildQueries(["ok_one", "bad handle", "x".repeat(20)], [{ mint: SOL, symbol: null }]);
    expect(q).toContain("from:ok_one");
    expect(q).not.toContain("bad handle");
  });
});

describe("classifyPost", () => {
  const tokens = [{ mint: SOL, symbol: "BONK" }];

  it("calls an exact mint verified", () => {
    expect(classifyPost(post(`ape ${SOL} now`), tokens)[0].level).toBe("verified");
  });

  it("finds the mint inside a link", () => {
    expect(classifyPost(post("look", { urls: [`https://dexscreener.com/solana/${SOL}`] }), tokens)[0].level).toBe("verified");
  });

  it("calls a $symbol-only post possible", () => {
    expect(classifyPost(post("$bonk looks strong"), tokens)[0].level).toBe("possible");
  });

  it("does not match a longer symbol or plain text", () => {
    expect(classifyPost(post("$BONKERS going up"), tokens)).toEqual([]);
    expect(classifyPost(post("bonk is a dog"), tokens)).toEqual([]);
  });
});

describe("parseSearch", () => {
  it("joins posts with their authors", () => {
    const { posts, newestId } = parseSearch({
      data: [{ id: "5", text: "hi", created_at: "2026-10-08T10:00:00.000Z", author_id: "9" }],
      includes: { users: [{ id: "9", username: "cobie", name: "Cobie" }] },
      meta: { newest_id: "5" },
    });
    expect(posts[0].username).toBe("cobie");
    expect(newestId).toBe("5");
  });

  it("survives an empty or odd response", () => {
    expect(parseSearch(null).posts).toEqual([]);
    expect(parseSearch({ data: [{ id: 1 }] }).posts).toEqual([]);
  });
});

describe("isFresh", () => {
  it("accepts recent posts and rejects old or future ones", () => {
    const now = Date.now();
    expect(isFresh(post("x", { createdAt: new Date(now - 60_000).toISOString() }), now, 3_600_000)).toBe(true);
    expect(isFresh(post("x", { createdAt: new Date(now - 7_200_000).toISOString() }), now, 3_600_000)).toBe(false);
    expect(isFresh(post("x", { createdAt: new Date(now + 600_000).toISOString() }), now, 3_600_000)).toBe(false);
  });
});
