import { describe, expect, it } from "vitest";
import { simulateSatelliteAnalysis } from "./satellite";

const boundary = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[77.58, 12.96], [77.59, 12.96], [77.59, 12.97], [77.58, 12.97], [77.58, 12.96]]] } } as const;

describe("simulated Sentinel-2 analysis", () => {
  it("returns a deterministic georeferenced NDVI raster-style overlay", () => {
    const first = simulateSatelliteAnalysis(boundary, "ndvi"); const second = simulateSatelliteAnalysis(boundary, "ndvi");
    expect(first.overlayUrl).toMatch(/^data:image\/svg\+xml;base64,/); expect(first.overlayUrl).toBe(second.overlayUrl); expect(first.bounds).toEqual({ north: 12.97, south: 12.96, east: 77.59, west: 77.58 }); expect(first.meanValue).toBeGreaterThanOrEqual(-0.05); expect(first.meanValue).toBeLessThanOrEqual(0.73);
  });
  it("returns a distinct NDWI moisture overlay from the same field geometry", () => { expect(simulateSatelliteAnalysis(boundary, "ndwi").overlayUrl).not.toBe(simulateSatelliteAnalysis(boundary, "ndvi").overlayUrl); });
});
