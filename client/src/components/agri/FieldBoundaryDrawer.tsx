import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { appendBoundaryPoint, pointsFromBoundary, toFeatureBoundary, type BoundaryPosition, type FieldBoundary } from "./fieldBoundary";
import { Crosshair, Eraser, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type { FieldBoundary } from "./fieldBoundary";

type Coordinates = { latitude: number; longitude: number };

type FieldBoundaryDrawerProps = {
  boundary: FieldBoundary | null;
  initialCenter?: Coordinates;
  onChange: (boundary: FieldBoundary | null) => void;
};

const worldCenter = { lat: 20, lng: 0 };

export function FieldBoundaryDrawer({ boundary, initialCenter, onChange }: FieldBoundaryDrawerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [points, setPoints] = useState(() => pointsFromBoundary(boundary));
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const drawGeometry = useCallback((map: google.maps.Map, currentPoints: BoundaryPosition[]) => {
    polygonRef.current?.setMap(null);
    polylineRef.current?.setMap(null);
    polygonRef.current = null;
    polylineRef.current = null;
    const path = currentPoints.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }));
    if (path.length >= 3) {
      polygonRef.current = new google.maps.Polygon({
        paths: path,
        strokeColor: "#2D6A4F",
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: "#78b985",
        fillOpacity: 0.2,
        clickable: false,
        map,
      });
    } else if (path.length > 0) {
      polylineRef.current = new google.maps.Polyline({ path, strokeColor: "#2D6A4F", strokeOpacity: 0.9, strokeWeight: 2, map });
    }
  }, []);

  const applyPoints = useCallback((nextPoints: BoundaryPosition[]) => {
    setPoints(nextPoints);
    if (mapRef.current) drawGeometry(mapRef.current, nextPoints);
    onChange(toFeatureBoundary(nextPoints));
  }, [drawGeometry, onChange]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    drawGeometry(map, points);
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      setLocationMessage("");
      setPoints(previous => {
        const next = appendBoundaryPoint(previous, [event.latLng!.lng(), event.latLng!.lat()]);
        drawGeometry(map, next);
        onChange(toFeatureBoundary(next));
        return next;
      });
    });
  }, [drawGeometry, onChange, points]);

  useEffect(() => {
    if (mapRef.current) drawGeometry(mapRef.current, points);
  }, [drawGeometry, points]);

  useEffect(() => {
    const storedPoints = pointsFromBoundary(boundary);
    if (storedPoints.length >= 3 && JSON.stringify(storedPoints) !== JSON.stringify(points)) setPoints(storedPoints);
  }, [boundary, points]);

  function centerOnBrowserLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location services are unavailable in this browser. Pan the map manually and draw the field boundary.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        mapRef.current?.panTo({ lat: position.coords.latitude, lng: position.coords.longitude });
        mapRef.current?.setZoom(16);
        setLocationMessage("Map centered on your device. Click at least three points around the field boundary.");
        setIsLocating(false);
      },
      () => {
        setLocationMessage("AgriNova could not access this device’s location. Pan the map manually and draw the field boundary.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const complete = points.length >= 3;
  const center = initialCenter ? { lat: initialCenter.latitude, lng: initialCenter.longitude } : worldCenter;
  return <div className="grid gap-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-medium text-[#254334]">Field boundary</p><p className="mt-0.5 text-xs text-[#61736a]">Click around the edge of the field. Three or more points create a saved GeoJSON polygon.</p></div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="border-[#cddbd0] text-[#1e5a3c] hover:bg-[#eff7f0]" onClick={centerOnBrowserLocation} disabled={isLocating}><Crosshair className="h-3.5 w-3.5" /> {isLocating ? "Locating…" : "Centre on me"}</Button><Button type="button" variant="outline" size="sm" aria-label="Undo the latest boundary point" onClick={() => applyPoints(points.slice(0, -1))} disabled={!points.length}><Undo2 className="h-3.5 w-3.5" /> Undo</Button><Button type="button" variant="outline" size="sm" aria-label="Clear the field boundary" className="text-[#a14332] hover:bg-[#fff1ee] hover:text-[#a14332]" onClick={() => applyPoints([])} disabled={!points.length}><Eraser className="h-3.5 w-3.5" /> Clear</Button></div>
    </div>
    <div className="overflow-hidden rounded-xl border border-[#bfd3c3] bg-[#eef5ef]"><MapView className="h-72" initialCenter={center} initialZoom={initialCenter ? 15 : 2} onMapReady={handleMapReady} /></div>
    <p className={`min-h-5 text-xs ${complete ? "text-[#2D6A4F]" : "text-[#64766b]"}`} role="status">{complete ? `Boundary complete: ${points.length} vertices will be stored as GeoJSON.` : `${points.length}/3 boundary vertices selected.`}</p>
    {locationMessage ? <p className="text-xs leading-5 text-[#a14332]" role="status">{locationMessage}</p> : null}
  </div>;
}
