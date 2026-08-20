import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { cn } from "@/lib/utils";
import { getSatelliteMapStatus, type SatelliteMapMode } from "./satelliteMapState";
import { Layers3, Loader2, Map as MapIcon, Satellite, Waves } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type MapMode = SatelliteMapMode;
type Bounds = { north: number; south: number; east: number; west: number };
type AnalysisView = { overlayUrl: string; boundsJson: string; meanValue: number | null; provider: string; acquiredAt: Date | string | null; cloudPercent: number | null };
type Boundary = { type: "Feature"; geometry: { type: "Polygon"; coordinates: [number, number][][] } };

function parseBoundary(value: string | null): Boundary | null { try { const parsed = value ? JSON.parse(value) : null; return parsed?.type === "Feature" && parsed.geometry?.type === "Polygon" ? parsed : null; } catch { return null; } }
function parseBounds(value: string): Bounds | null { try { const parsed = JSON.parse(value); return typeof parsed.north === "number" ? parsed : null; } catch { return null; } }

export function FieldSatelliteMap({ fieldId, latitude, longitude, boundaryGeoJson }: { fieldId: number; latitude: number; longitude: number; boundaryGeoJson: string | null }) {
  const boundary = parseBoundary(boundaryGeoJson);
  const [mode, setMode] = useState<MapMode>("base");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const utils = trpc.useUtils();
  const ndvi = trpc.agri.satellite.latest.useQuery({ fieldId, indexType: "ndvi" }, { enabled: Boolean(boundary) && mode === "ndvi" });
  const ndwi = trpc.agri.satellite.latest.useQuery({ fieldId, indexType: "ndwi" }, { enabled: Boolean(boundary) && mode === "ndwi" });
  const generate = trpc.agri.satellite.analyze.useMutation({ onMutate: () => setGenerationError(null), onSuccess: () => { utils.agri.satellite.latest.invalidate(); toast.success("Satellite-style overlay generated"); }, onError: error => { const message = error.message || "AgriNova could not generate this overlay."; setGenerationError(message); toast.error(message); } });
  const active = mode === "ndvi" ? ndvi.data as AnalysisView | null | undefined : mode === "ndwi" ? ndwi.data as AnalysisView | null | undefined : null;
  const activeQuery = mode === "ndvi" ? ndvi : mode === "ndwi" ? ndwi : null;

  const renderLayers = useCallback((map: google.maps.Map, analysis: AnalysisView | null | undefined) => {
    polygonRef.current?.setMap(null); overlayRef.current?.setMap(null); polygonRef.current = null; overlayRef.current = null;
    if (!boundary) return;
    const path = (boundary.geometry.coordinates[0] ?? []).map(([longitudeValue, latitudeValue]) => ({ lat: latitudeValue, lng: longitudeValue }));
    polygonRef.current = new google.maps.Polygon({ paths: path, strokeColor: "#ffffff", strokeWeight: 2.5, strokeOpacity: 0.95, fillColor: mode === "base" ? "#78b985" : "#ffffff", fillOpacity: mode === "base" ? 0.22 : 0.03, clickable: false, map });
    if (analysis?.overlayUrl) {
      const bounds = parseBounds(analysis.boundsJson);
      if (bounds) overlayRef.current = new google.maps.GroundOverlay(analysis.overlayUrl, { north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }, { opacity: 0.82, map });
    }
  }, [boundary, mode]);

  const handleMapReady = useCallback((map: google.maps.Map) => { mapRef.current = map; renderLayers(map, active); }, [active, renderLayers]);
  useEffect(() => { if (mapRef.current) renderLayers(mapRef.current, active); }, [active, renderLayers]);

  function chooseMode(nextMode: MapMode) {
    if (nextMode !== mode) setGenerationError(null);
    setMode(nextMode);
    if (nextMode === "base" || !boundary) return;
    const existing = nextMode === "ndvi" ? ndvi.data : ndwi.data;
    if (!existing && !generate.isPending) generate.mutate({ fieldId, indexType: nextMode });
  }

  const item = (key: MapMode, label: string, icon: React.ReactNode) => <Button type="button" variant="ghost" size="sm" aria-pressed={mode === key} onClick={() => chooseMode(key)} className={cn("gap-1.5 rounded-lg px-3 text-xs text-[#557067] hover:bg-white", mode === key && "bg-white text-[#175d3b] shadow-sm")}>{icon}{label}</Button>;
  if (!boundary) return <div className="rounded-2xl border border-dashed border-[#c7d7ca] bg-[#f5faf5] p-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dceede] text-[#2D6A4F]"><Layers3 className="h-5 w-5" /></div><div><h2 className="font-semibold text-[#153a28]">Satellite field map</h2><p className="mt-1 text-sm leading-5 text-[#61736a]">Draw a field polygon in the field registry to generate clipped NDVI and NDWI overlays.</p></div></div></div>;

  const measurement = active?.meanValue !== null && active?.meanValue !== undefined ? `${active.meanValue >= 0 ? "+" : ""}${active.meanValue.toFixed(2)}` : null;
  const mapStatus = getSatelliteMapStatus({ mode, isLoading: Boolean(activeQuery?.isLoading), queryError: Boolean(activeQuery?.error), generationError, hasActiveOverlay: Boolean(active), provider: active?.provider, cloudPercent: active?.cloudPercent });
  return <section className="overflow-hidden rounded-2xl border border-[#dce6dc] bg-white shadow-[0_4px_20px_rgba(27,67,50,0.05)]"><div className="flex flex-col gap-4 border-b border-[#e3ebe4] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#587066]">Sentinel-2 field intelligence</p><h2 className="mt-1 text-xl font-semibold text-[#012d1d]">Boundary-clipped vegetation and moisture</h2></div><div className="flex rounded-xl bg-[#eff4ef] p-1">{item("base", "Base", <MapIcon className="h-3.5 w-3.5" />)}{item("ndvi", "NDVI", <Satellite className="h-3.5 w-3.5" />)}{item("ndwi", "NDWI", <Waves className="h-3.5 w-3.5" />)}</div></div><div className="relative"><MapView className="h-[360px]" initialCenter={{ lat: latitude, lng: longitude }} initialZoom={15} onMapReady={handleMapReady} />{(generate.isPending || (mode !== "base" && activeQuery?.isLoading)) ? <div className="absolute inset-0 flex items-center justify-center bg-[#f7fbf7]/75 backdrop-blur-sm"><div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#1e5a3c] shadow-lg"><Loader2 className="h-4 w-4 animate-spin" />Generating deterministic preview…</div></div> : null}</div><div className="flex flex-wrap items-center justify-between gap-3 bg-[#f6f8f5] px-5 py-3 text-xs"><p className={mapStatus.tone === "error" ? "text-[#a14332]" : "text-[#61736a]"}>{mapStatus.message}</p>{measurement ? <span className="rounded-full bg-white px-2.5 py-1 font-mono font-semibold text-[#1e5a3c]">Mean {mode.toUpperCase()}: {measurement}</span> : null}</div></section>;
}
