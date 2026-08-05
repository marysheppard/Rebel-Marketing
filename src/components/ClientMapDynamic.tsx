"use client";

import dynamic from "next/dynamic";
import type { ClientMapMarker } from "@/components/ClientMap";

const ClientMapInner = dynamic(
  () => import("@/components/ClientMap").then((m) => m.ClientMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <h3 className="mb-3 font-semibold text-[#0b1f3a]">Client map</h3>
        <div className="flex h-80 items-center justify-center text-sm opacity-60">
          Loading map…
        </div>
      </div>
    ),
  },
);

export function ClientMapDynamic({
  markers,
  missingCount = 0,
}: {
  markers: ClientMapMarker[];
  missingCount?: number;
}) {
  return <ClientMapInner markers={markers} missingCount={missingCount} />;
}
