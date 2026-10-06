import { describe, expect, it } from "vitest";
import { mergePeak } from "./peaks";

const at = "2026-10-06T00:00:00Z";

describe("mergePeak", () => {
  it("starts from the first observation", () => {
    expect(mergePeak(null, 2, 20_000, at)).toMatchObject({
      priceUsd: 2,
      liquidityUsd: 20_000,
    });
  });

  it("keeps the old peak when values fall", () => {
    const first = mergePeak(null, 2, 20_000, at);
    expect(mergePeak(first, 0.1, 3_000, at)).toMatchObject({
      priceUsd: 2,
      liquidityUsd: 20_000,
    });
  });

  it("raises the peak when values rise", () => {
    const first = mergePeak(null, 1, 10_000, at);
    expect(mergePeak(first, 3, 25_000, at)).toMatchObject({
      priceUsd: 3,
      liquidityUsd: 25_000,
    });
  });

  it("limits a one-scan jump to 10x", () => {
    const first = mergePeak(null, 1, 10_000, at);
    expect(mergePeak(first, 500, 9_000_000, at)).toMatchObject({
      priceUsd: 10,
      liquidityUsd: 100_000,
    });
  });

  it("ignores missing or zero values", () => {
    const first = mergePeak(null, 1, 10_000, at);
    expect(mergePeak(first, null, 0, at)).toMatchObject({
      priceUsd: 1,
      liquidityUsd: 10_000,
    });
  });
});
