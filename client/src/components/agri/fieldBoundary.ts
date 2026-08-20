export type BoundaryPosition = [number, number];
export type FieldBoundary = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "Polygon"; coordinates: BoundaryPosition[][] };
};

export function appendBoundaryPoint(points: BoundaryPosition[], point: BoundaryPosition) {
  return [...points, point];
}

export function toFeatureBoundary(points: BoundaryPosition[]): FieldBoundary | null {
  if (points.length < 3) return null;
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...points, points[0]!]] } };
}

export function pointsFromBoundary(boundary: FieldBoundary | null) {
  const ring = boundary?.geometry.coordinates[0] ?? [];
  return ring.length > 1 ? ring.slice(0, -1) : [];
}
