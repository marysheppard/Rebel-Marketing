"use client";

import { useRouter } from "next/navigation";
import type { PeriodKey } from "@/lib/period";

export const ALL_CLIENTS_VALUE = "all";

export function ClientAnalyticsPicker({
  clients,
  selectedId,
  period = "last30",
}: {
  clients: { id: string; name: string }[];
  selectedId: string;
  period?: PeriodKey;
}) {
  const router = useRouter();

  return (
    <label className="flex max-w-md flex-col gap-1">
      <span className="text-sm font-medium opacity-70">Client</span>
      <select
        className="select select-bordered w-full"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          const params = new URLSearchParams();
          params.set("client", id);
          if (period && period !== "last30") params.set("period", period);
          const q = params.toString();
          router.push(`/app/analytics?${q}`);
        }}
      >
        <option value={ALL_CLIENTS_VALUE}>All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
