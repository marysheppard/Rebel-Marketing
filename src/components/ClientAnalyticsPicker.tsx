"use client";

import { useRouter } from "next/navigation";

export function ClientAnalyticsPicker({
  clients,
  selectedId,
}: {
  clients: { id: string; name: string }[];
  selectedId: string;
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
          router.push(id ? `/app/analytics?client=${id}` : "/app/analytics");
        }}
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
