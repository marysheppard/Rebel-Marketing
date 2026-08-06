"use client";

import { useEffect, useId, useState } from "react";
import { CreateInvoiceForm } from "@/components/forms";

type Option = { id: string; label: string };

export function CreateInvoiceModal({
  clients,
  contracts,
  campaigns,
  unbilledWorkByCampaign,
}: {
  clients: Option[];
  contracts: { id: string; label: string; client_id: string }[];
  campaigns: { id: string; label: string; client_id: string }[];
  unbilledWorkByCampaign: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Create Invoice
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-base-content/40 backdrop-blur-sm"
            aria-label="Close create invoice dialog"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
              <h2 id={titleId} className="text-lg font-bold tracking-tight">
                Create invoice
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-3">
              <CreateInvoiceForm
                compact
                clients={clients}
                contracts={contracts}
                campaigns={campaigns}
                unbilledWorkByCampaign={unbilledWorkByCampaign}
                onCancel={() => setOpen(false)}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
