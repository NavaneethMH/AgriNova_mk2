import { describe, expect, it } from "vitest";
import { getSatelliteMapStatus } from "./satelliteMapState";

describe("satellite map status model", () => {
  it("identifies the first-run loading state", () => { expect(getSatelliteMapStatus({ mode: "ndvi", isLoading: true, queryError: false, generationError: null, hasActiveOverlay: false }).message).toContain("Checking for a saved NDVI"); });
  it("identifies the no-cache generation state", () => { expect(getSatelliteMapStatus({ mode: "ndwi", isLoading: false, queryError: false, generationError: null, hasActiveOverlay: false }).message).toContain("No cached NDWI overlay"); });
  it("retains a generation failure as an error state", () => { const result = getSatelliteMapStatus({ mode: "ndvi", isLoading: false, queryError: false, generationError: "Service unavailable", hasActiveOverlay: false }); expect(result.tone).toBe("error"); expect(result.message).toContain("Service unavailable"); });
});
