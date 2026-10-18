import { describe, it, expect } from "vitest";
import { buildMentionQuery, dayStamp, intEnv, compareIds } from "./query";
import { postReply } from "./post";

describe("buildMentionQuery", () => {
  it("builds the search", () => {
    expect(buildMentionQuery("HODLB0T")).toBe("@HODLB0T -from:HODLB0T -is:retweet");
    expect(buildMentionQuery("@HODLB0T")).toBe("@HODLB0T -from:HODLB0T -is:retweet");
  });
  it("refuses a bad handle", () => {
    expect(() => buildMentionQuery("bad handle")).toThrow();
    expect(() => buildMentionQuery("a".repeat(16))).toThrow();
    expect(() => buildMentionQuery("")).toThrow();
  });
});

describe("helpers", () => {
  it("day stamp", () => {
    expect(dayStamp(new Date("2026-10-18T23:59:00Z"))).toBe("2026-10-18");
  });
  it("intEnv falls back and clamps", () => {
    expect(intEnv(undefined, 5, 1, 50)).toBe(5);
    expect(intEnv("", 5, 1, 50)).toBe(5);
    expect(intEnv("abc", 5, 1, 50)).toBe(5);
    expect(intEnv("2.5", 5, 1, 50)).toBe(5);
    expect(intEnv("500", 5, 1, 50)).toBe(50);
    expect(intEnv("0", 5, 1, 50)).toBe(1);
    expect(intEnv("12", 5, 1, 50)).toBe(12);
  });
  it("orders ids that exceed a JS number", () => {
    expect(compareIds("1980000000000000001", "1980000000000000002")).toBeLessThan(0);
    expect(compareIds("999", "1000")).toBeLessThan(0);
    expect(compareIds("5", "5")).toBe(0);
  });
});

describe("402 handling", () => {
  it("reports depleted credits", async () => {
    const creds = { apiKey: "a", apiSecret: "b", accessToken: "c", accessSecret: "d" };
    const fake: typeof fetch = async () => new Response("{}", { status: 402 });
    const r = await postReply({ text: "hi", inReplyTo: "123", creds, live: true, fetchImpl: fake });
    expect(r).toMatchObject({ ok: false, reason: "no_credits" });
  });
});
