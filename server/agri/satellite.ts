import { desc, eq } from "drizzle-orm";
import { satelliteAnalyses } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { parseStoredBoundary, type FieldBoundary } from "./geojson";
import { getOwnedField } from "./repository";

export type SatelliteIndexType = "ndvi" | "ndwi";
type Bounds = { north: number; south: number; east: number; west: number };
type SatelliteResponse = { provider: string; indexType: SatelliteIndexType; overlayUrl: string; bounds: Bounds; meanValue: number; acquiredAt: string; cloudPercent: number; mode: "simulation" | "earth_engine" };

function bbox(boundary: FieldBoundary): Bounds {
  const polygon = boundary.type === "Feature" ? boundary.geometry : boundary;
  const ring = polygon.coordinates[0] ?? [];
  const longitudes = ring.map(point => point[0]); const latitudes = ring.map(point => point[1]);
  return { north: Math.max(...latitudes), south: Math.min(...latitudes), east: Math.max(...longitudes), west: Math.min(...longitudes) };
}

function seeded(boundary: FieldBoundary, indexType: SatelliteIndexType) {
  const serialized = JSON.stringify(boundary) + indexType;
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) hash = Math.imul(hash ^ serialized.charCodeAt(index), 16_777_619);
  return ((hash >>> 0) % 10_000) / 10_000;
}

function simulatedOverlay(boundary: FieldBoundary, indexType: SatelliteIndexType, bounds: Bounds, meanValue: number) {
  const polygon = boundary.type === "Feature" ? boundary.geometry : boundary;
  const ring = polygon.coordinates[0] ?? [];
  const width = Math.max(bounds.east - bounds.west, 1e-9), height = Math.max(bounds.north - bounds.south, 1e-9);
  const points = ring.map(([longitude, latitude]) => `${24 + (longitude - bounds.west) / width * 720},${24 + (bounds.north - latitude) / height * 432}`).join(" ");
  const colors = indexType === "ndvi" ? ["#e74c3c", "#f5c542", "#72b95f", "#176b47"] : ["#a046dc", "#5487d8", "#42bad0", "#155e9e"];
  const circles = Array.from({ length: 7 }, (_, index) => `<circle cx="${120 + index * 105}" cy="${235 + Math.sin(index * 1.9) * 90}" r="${92 + (index % 3) * 14}" fill="${colors[(index + 1) % 4]}" opacity=".34"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${colors.map((color, index) => `<stop offset="${index * 33}%" stop-color="${color}"/>`).join("")}</linearGradient><clipPath id="field"><polygon points="${points}"/></clipPath><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#fff" stroke-opacity=".18"/></pattern></defs><rect width="768" height="480" fill="#0b2031" opacity=".12"/><g clip-path="url(#field)"><rect width="768" height="480" fill="url(#g)"/>${circles}<rect width="768" height="480" fill="url(#grid)"/></g><polygon points="${points}" fill="none" stroke="#fff" stroke-width="4"/><rect x="24" y="24" width="256" height="42" rx="12" fill="#10251d" fill-opacity=".78"/><text x="42" y="51" fill="#fff" font-family="Arial" font-size="16" font-weight="700">SIMULATED ${indexType.toUpperCase()} · ${meanValue >= 0 ? "+" : ""}${meanValue.toFixed(2)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function simulateSatelliteAnalysis(boundary: FieldBoundary, indexType: SatelliteIndexType): SatelliteResponse {
  const seed = seeded(boundary, indexType); const meanValue = Number((indexType === "ndvi" ? -0.05 + seed * 0.78 : -0.25 + seed * 0.62).toFixed(2)); const bounds = bbox(boundary);
  return { provider: "sentinel-2-simulated", indexType, overlayUrl: simulatedOverlay(boundary, indexType, bounds, meanValue), bounds, meanValue, acquiredAt: new Date().toISOString(), cloudPercent: Number((6 + Math.abs(meanValue) * 17).toFixed(1)), mode: "simulation" };
}

async function remoteOrSimulated(boundary: FieldBoundary, indexType: SatelliteIndexType) {
  if (!/^https:\/\//.test(ENV.satelliteAnalysisUrl)) return simulateSatelliteAnalysis(boundary, indexType);
  const response = await fetch(`${ENV.satelliteAnalysisUrl.replace(/\/$/, "")}/v1/analyze`, { method: "POST", headers: { "Content-Type": "application/json", ...(ENV.satelliteAnalysisApiKey ? { "X-AgriNova-Service-Key": ENV.satelliteAnalysisApiKey } : {}) }, body: JSON.stringify({ boundary, indexType }), signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Satellite service returned ${response.status}.`);
  return response.json() as Promise<SatelliteResponse>;
}

export async function analyzeFieldSatellite(userId: number, fieldId: number, indexType: SatelliteIndexType) {
  const field = await getOwnedField(userId, fieldId); if (!field) return undefined;
  const boundary = parseStoredBoundary(field.boundaryGeoJson); if (!boundary) throw new Error("Draw and save a polygon field boundary before requesting a satellite overlay.");
  const result = await remoteOrSimulated(boundary, indexType); const db = await getDb(); if (!db) throw new Error("The AgriNova data store is not available.");
  const [created] = await db.insert(satelliteAnalyses).values({ fieldId, indexType, provider: result.provider, overlayUrl: result.overlayUrl, boundsJson: JSON.stringify(result.bounds), meanValue: result.meanValue, acquiredAt: new Date(result.acquiredAt), cloudPercent: result.cloudPercent }).$returningId();
  const [stored] = await db.select().from(satelliteAnalyses).where(eq(satelliteAnalyses.id, created.id)).limit(1); return stored;
}

export async function getLatestSatelliteAnalysis(userId: number, fieldId: number, indexType: SatelliteIndexType) { const field = await getOwnedField(userId, fieldId); if (!field) return undefined; const db = await getDb(); if (!db) throw new Error("The AgriNova data store is not available."); const [analysis] = await db.select().from(satelliteAnalyses).where(eq(satelliteAnalyses.fieldId, fieldId)).orderBy(desc(satelliteAnalyses.createdAt)).limit(10); return analysis?.indexType === indexType ? analysis : (await db.select().from(satelliteAnalyses).where(eq(satelliteAnalyses.fieldId, fieldId)).orderBy(desc(satelliteAnalyses.createdAt)).limit(10)).find(item => item.indexType === indexType) ?? null; }
