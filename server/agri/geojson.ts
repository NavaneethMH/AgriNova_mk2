import { z } from "zod";

export type GeoJsonPosition = [number, number];
export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoJsonPosition[][];
};
export type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJsonPolygon;
};
export type FieldBoundary = GeoJsonPolygon | GeoJsonFeature;

const positionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const linearRingSchema = z.array(positionSchema).min(4);
const polygonSchema = z.object({ type: z.literal("Polygon"), coordinates: z.array(linearRingSchema).min(1) });
const featureSchema = z.object({ type: z.literal("Feature"), properties: z.record(z.string(), z.unknown()).default({}), geometry: polygonSchema });

export const fieldBoundarySchema = z.union([polygonSchema, featureSchema]).superRefine((value, ctx) => {
  const outerRing = value.type === "Feature" ? value.geometry.coordinates[0] : value.coordinates[0];
  if (!outerRing) {
    ctx.addIssue({ code: "custom", message: "A field boundary needs an outer polygon ring." });
    return;
  }
  const first = outerRing[0];
  const last = outerRing[outerRing.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    ctx.addIssue({ code: "custom", message: "The field polygon must be closed." });
  }
});

export function polygonFromBoundary(boundary: FieldBoundary): GeoJsonPolygon {
  return boundary.type === "Feature" ? boundary.geometry : boundary;
}

export function centroidFromBoundary(boundary: FieldBoundary) {
  const ring = polygonFromBoundary(boundary).coordinates[0] ?? [];
  const points = ring.slice(0, -1);
  if (points.length < 3) throw new Error("The field boundary needs at least three distinct points.");
  const sum = points.reduce((accumulator, [longitude, latitude]) => ({ latitude: accumulator.latitude + latitude, longitude: accumulator.longitude + longitude }), { latitude: 0, longitude: 0 });
  return { latitude: sum.latitude / points.length, longitude: sum.longitude / points.length };
}

export function parseStoredBoundary(value: string | null): FieldBoundary | null {
  if (!value) return null;
  try {
    return fieldBoundarySchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
