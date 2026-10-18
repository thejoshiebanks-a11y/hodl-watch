import { describe, it, expect } from "vitest";
import { parseMention } from "./mention";
import type { XPost } from "@/lib/social/x";

const MINT = "So11111111111111111111111111111111111111112";

const post = (o: Partial<XPost>): XPost => ({
  id: "100",
  text: `@HODLbot scan ${MINT}`,
  createdAt: "2026-10-18T12:00:00.000Z",
  authorId: "42",
  username: "alice",
  name: "Alice",
  urls: [],
  ...o,
});

describe("parseMention", () => {
  it("accepts a mention with a mint", () => {
    expect(parseMention(post({}), "HODLbot")).toEqual({
      ok: true,
      mint: MINT,
      postId: "100",
      userId: "42",
      username: "alice",
    });
  });

  it("ignores the handle's case and a leading @", () => {
    expect(parseMention(post({ text: `@hodlbot ${MINT}` }), "@HODLbot").ok).toBe(true);
  });

  it("never answers its own posts", () => {
    const r = parseMention(post({ username: "HODLbot" }), "HODLbot");
    expect(r).toEqual({ ok: false, reason: "self" });
  });

  it("needs the bot to be addressed by handle", () => {
    const r = parseMention(post({ text: `check ${MINT}` }), "HODLbot");
    expect(r).toEqual({ ok: false, reason: "not_addressed" });
  });

  it("does not match a longer handle", () => {
    const r = parseMention(post({ text: `@HODLbotfake ${MINT}` }), "HODLbot");
    expect(r).toEqual({ ok: false, reason: "not_addressed" });
  });

  it("needs a mint", () => {
    const r = parseMention(post({ text: "@HODLbot scan this" }), "HODLbot");
    expect(r).toEqual({ ok: false, reason: "no_mint" });
  });

  it("needs an author", () => {
    const r = parseMention(post({ authorId: null }), "HODLbot");
    expect(r).toEqual({ ok: false, reason: "no_author" });
  });
});
