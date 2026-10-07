import { describe, expect, it } from "vitest";
import { raiseRiskLabel, raiseRiskTone, riskFloor } from "./risk";

describe("risk floor", () => {
  it("is empty without caps", () => {
    expect(riskFloor(undefined)).toBeNull();
    expect(riskFloor([])).toBeNull();
  });

  it("is High for a cap of 3 or lower", () => {
    expect(riskFloor([{ max: 3 }, { max: 6.5 }])).toBe("High");
    expect(riskFloor([{ max: 1.5 }])).toBe("High");
  });

  it("is Moderate for caps up to 5.5", () => {
    expect(riskFloor([{ max: 5 }])).toBe("Moderate");
    expect(riskFloor([{ max: 5.5 }])).toBe("Moderate");
  });

  it("ignores mild caps such as a young pool", () => {
    expect(riskFloor([{ max: 6.5 }])).toBeNull();
  });
});

describe("raiseRiskLabel", () => {
  it("raises Low to High on a hard flag", () => {
    expect(raiseRiskLabel("Low", [{ max: 3 }])).toBe("High");
  });

  it("raises Low and N/A to Moderate, never lowers anything", () => {
    expect(raiseRiskLabel("Low", [{ max: 5 }])).toBe("Moderate");
    expect(raiseRiskLabel("N/A", [{ max: 5 }])).toBe("Moderate");
    expect(raiseRiskLabel("High", [{ max: 5 }])).toBe("High");
  });

  it("leaves the label alone with no serious caps", () => {
    expect(raiseRiskLabel("Low", [{ max: 6.5 }])).toBe("Low");
  });
});

describe("raiseRiskTone", () => {
  it("returns the colour with the new label", () => {
    expect(raiseRiskTone(["Low", "text-emerald-300"], [{ max: 2 }])).toEqual([
      "High",
      "text-red-300",
    ]);
  });

  it("keeps the original when nothing changes", () => {
    const base: [string, string] = ["Low", "text-emerald-300"];
    expect(raiseRiskTone(base, [])).toBe(base);
  });
});
