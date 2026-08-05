"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type ClientMapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitMarkers({ markers }: { markers: ClientMapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) {
      map.setView([39.5, -98.35], 4);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [map, markers]);

  return null;
}

export function ClientMap({
  markers,
  missingCount = 0,
}: {
  markers: ClientMapMarker[];
  missingCount?: number;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <h3 className="mb-3 font-semibold text-[#0b1f3a]">Client map</h3>
      <div className="h-80 w-full overflow-hidden rounded-lg">
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMarkers markers={markers} />
          {markers.map((m) => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <Link
                    href={`/app/clients/${m.id}`}
                    className="font-semibold text-sky-700 underline"
                  >
                    {m.name}
                  </Link>
                  {m.city || m.state ? (
                    <div className="text-xs opacity-70">
                      {[m.city, m.state].filter(Boolean).join(", ")}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {markers.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">
          No client locations available to plot yet.
        </p>
      ) : null}
      {missingCount > 0 ? (
        <p className="mt-2 text-xs opacity-60">
          {missingCount} client{missingCount === 1 ? "" : "s"} missing map
          coordinates.
        </p>
      ) : null}
    </div>
  );
}
