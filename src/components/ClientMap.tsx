"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type ClientMapHealth = "risk" | "attention" | "ok";

export type ClientMapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  openCount?: number;
  overdueCount?: number;
  activeCampaignCount?: number;
  nextDueDate?: string;
  campaignNames?: string[];
  health?: ClientMapHealth;
};

export type ClientMapListItem = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  hasCoords: boolean;
  openCount: number;
  overdueCount: number;
  health: ClientMapHealth;
};

const HEALTH_COLOR: Record<ClientMapHealth, string> = {
  risk: "#ef4444",
  attention: "#f59e0b",
  ok: "#22c55e",
};

function healthIcon(health: ClientMapHealth = "ok") {
  const color = HEALTH_COLOR[health];
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function FitMarkers({ markers }: { markers: ClientMapMarker[] }) {
  const map = useMap();
  const markerKey = markers
    .map((m) => `${m.id}:${m.lat}:${m.lng}`)
    .join("|");

  useEffect(() => {
    map.invalidateSize();
    if (markers.length === 0) {
      map.setView([39.5, -98.35], 4);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0]!.lat, markers[0]!.lng], 10);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerKey]);

  return null;
}

function FlyToSelected({
  markers,
  selectedClientId,
}: {
  markers: ClientMapMarker[];
  selectedClientId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedClientId) return;
    const m = markers.find((x) => x.id === selectedClientId);
    if (!m) return;
    map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 10), { duration: 0.6 });
  }, [map, markers, selectedClientId]);

  return null;
}

function HoverTooltipPane() {
  const map = useMap();

  useLayoutEffect(() => {
    if (map.getPane("clientHoverTip")) return;

    const shell = map.getContainer().closest("[data-client-map-shell]");
    const tipHost = shell?.querySelector(
      "[data-client-map-tip-host]",
    ) as HTMLElement | null;
    if (!tipHost) return;

    const pane = map.createPane("clientHoverTip", tipHost);
    pane.style.zIndex = "650";
    pane.style.pointerEvents = "none";
  }, [map]);

  return null;
}

function HealthDot({ health }: { health: ClientMapHealth }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: HEALTH_COLOR[health] }}
      aria-hidden
    />
  );
}

export function ClientMap({
  markers,
  clients = [],
  missingCount = 0,
  selectedClientId = null,
  onSelectClient,
}: {
  markers: ClientMapMarker[];
  clients?: ClientMapListItem[];
  missingCount?: number;
  selectedClientId?: string | null;
  onSelectClient?: (clientId: string | null) => void;
}) {
  const missingClients =
    clients.length > 0
      ? clients.filter((c) => !c.hasCoords)
      : [];

  function selectClient(id: string) {
    if (!onSelectClient) return;
    onSelectClient(selectedClientId === id ? null : id);
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-semibold text-[#0b1f3a]">Client map</h3>
          <p className="text-xs opacity-60">
            Hover a pin for details · click to filter the dashboard
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] opacity-70">
          <span className="inline-flex items-center gap-1">
            <HealthDot health="ok" /> Healthy
          </span>
          <span className="inline-flex items-center gap-1">
            <HealthDot health="attention" /> Open work
          </span>
          <span className="inline-flex items-center gap-1">
            <HealthDot health="risk" /> Overdue
          </span>
        </div>
      </div>

      <div
        data-client-map-shell
        className="relative z-10 h-80 w-full overflow-visible"
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <MapContainer
            center={[39.5, -98.35]}
            zoom={4}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HoverTooltipPane />
            <FitMarkers markers={markers} />
            <FlyToSelected
              markers={markers}
              selectedClientId={selectedClientId}
            />
            {markers.map((m) => (
              <Marker
                key={m.id}
                position={[m.lat, m.lng]}
                icon={healthIcon(m.health)}
                opacity={
                  selectedClientId && selectedClientId !== m.id ? 0.45 : 1
                }
                eventHandlers={{
                  click: () => selectClient(m.id),
                }}
              >
                <Tooltip
                  pane="clientHoverTip"
                  direction="auto"
                  offset={[0, -10]}
                  opacity={1}
                  sticky
                  className="client-map-hover-tip !rounded-lg !border !border-base-300 !bg-base-100 !px-0 !py-0 !shadow-lg"
                >
                  <div className="min-w-[11rem] max-w-[16rem] space-y-1 p-2.5 text-sm text-base-content">
                    <div className="truncate font-semibold" title={m.name}>
                      {m.name}
                    </div>
                    {m.city || m.state ? (
                      <div
                        className="truncate text-xs opacity-70"
                        title={[m.city, m.state].filter(Boolean).join(", ")}
                      >
                        {[m.city, m.state].filter(Boolean).join(", ")}
                      </div>
                    ) : null}
                    <div className="space-y-0.5 text-xs">
                      <div>
                        Open tasks: <strong>{m.openCount ?? 0}</strong>
                        {(m.overdueCount ?? 0) > 0 ? (
                          <span className="text-error">
                            {" "}
                            ({m.overdueCount} overdue)
                          </span>
                        ) : null}
                      </div>
                      <div>
                        Active campaigns:{" "}
                        <strong>{m.activeCampaignCount ?? 0}</strong>
                      </div>
                      {m.nextDueDate ? (
                        <div>
                          Next due: <strong>{m.nextDueDate}</strong>
                        </div>
                      ) : null}
                      {m.campaignNames && m.campaignNames.length > 0 ? (
                        <div
                          className="truncate opacity-70"
                          title={m.campaignNames.join(" · ")}
                        >
                          {m.campaignNames.join(" · ")}
                        </div>
                      ) : null}
                    </div>
                    <div className="pt-0.5 text-[10px] opacity-50">
                      Click pin to filter dashboard
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div
          data-client-map-tip-host
          className="pointer-events-none absolute inset-0 z-[650] overflow-visible"
        />
      </div>

      {markers.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">
          No client locations available to plot yet.
        </p>
      ) : null}

      {missingCount > 0 ? (
        <div className="mt-3 border-t border-base-300 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Missing map coordinates ({missingCount})
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {missingClients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/clients/${c.id}`}
                  className="link link-hover"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs opacity-50">
            Open a client hub to review address details so the pin can be added.
          </p>
        </div>
      ) : null}
    </div>
  );
}
