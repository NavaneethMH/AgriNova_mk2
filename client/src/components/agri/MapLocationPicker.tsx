import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { Crosshair, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Coordinates = { latitude: number; longitude: number };

type MapLocationPickerProps = Coordinates & {
  hasLocation: boolean;
  onChange: (coordinates: Coordinates) => void;
};

const worldCenter = { lat: 20, lng: 0 };

export function MapLocationPicker({ latitude, longitude, hasLocation, onChange }: MapLocationPickerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const placeMarker = useCallback((map: google.maps.Map, coordinates: Coordinates) => {
    const position = { lat: coordinates.latitude, lng: coordinates.longitude };
    if (markerRef.current) {
      markerRef.current.position = position;
      markerRef.current.map = map;
      return;
    }
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title: "Selected field location",
    });
  }, []);

  const selectLocation = useCallback((coordinates: Coordinates, recenter = false) => {
    const map = mapRef.current;
    if (map) {
      placeMarker(map, coordinates);
      if (recenter) {
        map.panTo({ lat: coordinates.latitude, lng: coordinates.longitude });
        map.setZoom(15);
      }
    }
    setLocationMessage("");
    onChange(coordinates);
  }, [onChange, placeMarker]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      selectLocation({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
    });
    if (hasLocation) placeMarker(map, { latitude, longitude });
  }, [hasLocation, latitude, longitude, placeMarker, selectLocation]);

  useEffect(() => {
    if (hasLocation && mapRef.current) placeMarker(mapRef.current, { latitude, longitude });
  }, [hasLocation, latitude, longitude, placeMarker]);

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location services are unavailable in this browser. Select a point directly on the map.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        selectLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }, true);
        setIsLocating(false);
      },
      () => {
        setLocationMessage("AgriNova could not access this device’s location. Select the field directly on the map instead.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[#254334]">Field location</p>
          <p className="mt-0.5 text-xs text-[#61736a]">Click the map to pin the centre of this field.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="border-[#cddbd0] text-[#1e5a3c] hover:bg-[#eff7f0]" onClick={useBrowserLocation} disabled={isLocating}>
          <Crosshair className="h-3.5 w-3.5" /> {isLocating ? "Locating…" : "Use my location"}
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#bfd3c3] bg-[#eef5ef]">
        <MapView
          className="h-64"
          initialCenter={hasLocation ? { lat: latitude, lng: longitude } : worldCenter}
          initialZoom={hasLocation ? 15 : 2}
          onMapReady={handleMapReady}
        />
      </div>
      <div className="flex min-h-6 items-center gap-2 text-xs" aria-live="polite">
        <MapPin className="h-3.5 w-3.5 text-[#2D6A4F]" />
        {hasLocation ? <span className="font-mono text-[#355946]">Selected on map: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span> : <span className="text-[#64766b]">No field location selected yet.</span>}
      </div>
      {locationMessage ? <p className="text-xs leading-5 text-[#a14332]" role="status">{locationMessage}</p> : null}
    </div>
  );
}
