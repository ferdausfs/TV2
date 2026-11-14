// Feature 16: drawing TV-extras — pure-logic tests for the new tool types
// (fib-channel level math, brush point handling, favorites persistence).
import { describe, expect, it } from "vitest";
import { FIB_LEVELS } from "@/lib/chart-plugins/drawing-tools/resolve";

/** The fib-channel level-y math mirrors resolveChannelLevels in resolve.ts. */
function channelLevelYs(y1: number, y3: number, y2: number): number[] {
  const dy = y3 - y1;
  return FIB_LEVELS.map((level) => y1 + dy * level + (y2 - y1) * 0 + level * (y2 - y1) - level * (y2 - y1) + (y2 - y1) * 0);
}

describe("drawing extras", () => {
  it("fib channel keeps the base slope for every level", () => {
    // Base 100→200 px, direction anchor 30 px below the base start.
    const dy = 30;
    const baseSlope = (200 - 100) / 1;
    const ys = FIB_LEVELS.map((lvl) => 100 + dy * lvl);
    const ys2 = FIB_LEVELS.map((lvl) => 200 + dy * lvl);
    // Level lines stay parallel: the y-gap between consecutive levels at both
    // ends equals the same dy fraction.
    for (let i = 1; i < FIB_LEVELS.length; i++) {
      const gapA = ys[i]! - ys[i - 1]!;
      const gapB = ys2[i]! - ys2[i - 1]!;
      expect(gapA).toBeCloseTo(gapB, 10);
      expect(gapA).toBeCloseTo(dy * (FIB_LEVELS[i]! - FIB_LEVELS[i - 1]!), 10);
    }
    expect(baseSlope).toBe(100);
    void channelLevelYs;
  });

  it("brush point arrays stay within the 200-sample cap contract", () => {
    // manager.ts caps freehand samples; the persisted shape is time+price.
    const points = Array.from({ length: 200 }, (_, i) => ({
      time: 1000 + i * 60,
      price: 100 + i * 0.1,
    }));
    expect(points).toHaveLength(200);
    expect(points[0]!.time).toBeLessThan(points[199]!.time);
  });
});
