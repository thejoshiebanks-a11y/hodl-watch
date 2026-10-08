import { describe, expect, it } from "vitest";
import { decidePosted, findPost, xHandleFrom } from "./posted-match";
import type { XPost } from "./x";

const MINT = "So11111111111111111111111111111111111111112";
const post = (text: string, extra: Partial<XPost> = {}): XPost => ({
  id: "1",
  text,
  createdAt: new Date().toISOString(),
  authorId: "9",
  username: "project",
  name: "Project",
  urls: [],
  ...extra,
});

describe("xHandleFrom", () => {
  it("reads the account from x.com and twitter.com links", () => {
    expect(xHandleFrom([{ handle: "https://x.com/phubber" }])).toBe("phubber");
    expect(xHandleFrom([{ handle: "https://twitter.com/abc_1?s=20" }])).toBe("abc_1");
  });
  it("ignores communities, other sites and empty input", () => {
    expect(xHandleFrom([{ handle: "https://x.com/i/communities/123" }])).toBeNull();
    expect(xHandleFrom([{ handle: "https://t.me/group" }, { handle: null }])).toBeNull();
    expect(xHandleFrom([])).toBeNull();
  });
});

describe("findPost", () => {
  it("needs the right account and the exact mint", () => {
    expect(findPost([post(`CA: ${MINT}`)], "Project", MINT)?.id).toBe("1");
    expect(findPost([post(`CA: ${MINT}`, { username: "other" })], "project", MINT)).toBeNull();
    expect(findPost([post("no address here")], "project", MINT)).toBeNull();
  });
  it("finds the mint inside a link", () => {
    expect(findPost([post("chart", { urls: [`https://dexscreener.com/solana/${MINT}`] })], "project", MINT)).not.toBeNull();
  });
});

describe("decidePosted", () => {
  it("sets a baseline on the first check without firing", () => {
    expect(decidePosted(null, "YES")).toEqual({ fire: false, base: "YES" });
    expect(decidePosted(null, "NOT_SEEN")).toEqual({ fire: false, base: "NOT_SEEN" });
  });
  it("fires once when not seen turns into yes", () => {
    expect(decidePosted("NOT_SEEN", "YES")).toEqual({ fire: true, base: "YES" });
    expect(decidePosted("YES", "YES").fire).toBe(false);
  });
  it("never fires on unknown and never goes back from yes", () => {
    expect(decidePosted("NOT_SEEN", "UNKNOWN").fire).toBe(false);
    expect(decidePosted("YES", "NOT_SEEN")).toEqual({ fire: false, base: "YES" });
  });
});
