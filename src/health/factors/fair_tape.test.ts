import { describe, expect, it } from "vitest";
import { scoreAge, scoreStability } from "./extra";
import { scoreTape1h, scoreTape5m } from "./tape";

describe("direction-aware tape", () => {
  it("does not punish a pump inside the free band", () => {
    expect(scoreTape5m(20)!.score).toBe(10);
    expect(scoreTape1h(40)!.score).toBe(10);
  });

  it("fades slowly for extreme pumps but never below 5", () => {
    expect(scoreTape5m(5000)!.score).toBe(5);
    expect(scoreStability(3000, "24h")!.score).toBe(5);
  });

  it("still punishes falls harder than equal pumps", () => {
    expect(scoreTape5m(-50)!.score).toBeLessThan(scoreTape5m(50)!.score);
    expect(scoreStability(-60, "6h")!.score).toBeLessThan(
      scoreStability(60, "6h")!.score,
    );
  });
});

describe("age is uncertainty, not a failing grade", () => {
  it("scores a fresh pool 4, not 1", () => {
    const now = "2026-10-07T10:00:00.000Z";
    const born = "2026-10-07T09:40:00.000Z";
    expect(scoreAge(born, now, "Pool")!.score).toBe(4);
  });
});
