export type SatelliteMapMode = "base" | "ndvi" | "ndwi";
export type SatelliteMapStatusInput = { mode: SatelliteMapMode; isLoading: boolean; queryError: boolean; generationError: string | null; hasActiveOverlay: boolean; provider?: string; cloudPercent?: number | null };

export function getSatelliteMapStatus(input: SatelliteMapStatusInput) {
  if (input.mode === "base") return { tone: "default" as const, message: "Base map with saved GeoJSON field boundary." };
  const label = input.mode.toUpperCase();
  if (input.generationError) return { tone: "error" as const, message: `Unable to generate the ${label} preview: ${input.generationError} Select the mode again to retry.` };
  if (input.isLoading) return { tone: "default" as const, message: `Checking for a saved ${label} overlay…` };
  if (input.queryError) return { tone: "error" as const, message: `Unable to load the ${label} overlay. Select the mode again to retry.` };
  if (input.hasActiveOverlay) return { tone: "default" as const, message: `${label} ${input.provider === "sentinel-2-simulated" ? "simulation" : "Sentinel-2"} · cloud context ${input.cloudPercent?.toFixed(1) ?? "—"}%` };
  return { tone: "default" as const, message: `No cached ${label} overlay. Generating a deterministic preview.` };
}
