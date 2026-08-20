import { describe, expect, it } from "vitest";
import { appendBoundaryPoint, pointsFromBoundary, toFeatureBoundary } from "./fieldBoundary";

describe("field boundary point collection", () => {
  it("preserves existing vertices while adding each new map click", () => {
    const first = appendBoundaryPoint([], [77.58, 12.96]);
    const second = appendBoundaryPoint(first, [77.59, 12.96]);
    const third = appendBoundaryPoint(second, [77.59, 12.97]);
    expect(third).toEqual([[77.58, 12.96], [77.59, 12.96], [77.59, 12.97]]);
    const savedBoundary = toFeatureBoundary(third);
    expect(savedBoundary?.geometry.coordinates[0]).toHaveLength(4);
    expect(pointsFromBoundary(savedBoundary)).toEqual(third);
  });
});
