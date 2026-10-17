import { describe, it, expect } from "vitest";
import { alertLink } from "./link";

describe("alertLink", () => {
  it("allows a Solscan transaction", () => {
    expect(alertLink("https://solscan.io/tx/abc")?.label).toBe("View tx ↗");
  });
  it("allows an X post", () => {
    expect(alertLink("https://x.com/a/status/1")?.label).toBe("Open post ↗");
  });
  it("refuses everything else", () => {
    expect(alertLink(undefined)).toBeNull();
    expect(alertLink("javascript:alert(1)")).toBeNull();
    expect(alertLink("https://evil.com/https://solscan.io/tx/")).toBeNull();
    expect(alertLink("http://solscan.io/tx/abc")).toBeNull();
  });
});
