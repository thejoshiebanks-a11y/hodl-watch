import { describe, expect, it } from "vitest";
import { MAX_WATCHED_POOLS, normalizeAddresses } from "./addresses";

const A = "4oqeXR2DrZ4iBboq5GDTMvJQz792VTydtXs1Zfcn6NRH";
const B = "CBcjQNdtgb4SHwKDqKFxD3yPSk7pEMpKHQiMmZrgpump";

describe("normalizeAddresses", () => {
  it("drops duplicates and sorts", () => {
    expect(normalizeAddresses([B, A, B])).toEqual([A, B].sort());
  });

  it("drops anything that is not a valid address", () => {
    expect(normalizeAddresses([null, undefined, 5, "", "nope", A])).toEqual([A]);
  });

  it("caps the list", () => {
    const ids = "abcdefghijkmnopqrstuvwxyz";
    const many = Array.from(
      { length: 30 },
      (_, i) => "B".repeat(40) + ids[i % 25] + ids[Math.floor(i / 25)] + "AA",
    );
    expect(normalizeAddresses(many)).toHaveLength(MAX_WATCHED_POOLS);
  });

  it("copes with an empty list", () => {
    expect(normalizeAddresses([])).toEqual([]);
  });
});
