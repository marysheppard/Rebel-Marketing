"use client";

import Link from "next/link";
import { ContractPdfButton } from "@/components/contracts/ContractPdfButton";
import { StatusBadge } from "@/components/ui";
import type { ContractPdfRow } from "@/lib/contracts/contract-pdf";
import { normalizeContractStatus } from "@/lib/contract-status";

export type ClientContractDocumentRow = ContractPdfRow & {
  due_at?: string | null;
  open_for_signature: boolean;
};

export function ClientContractsDocumentsTable({
  rows,
}: {
  rows: ClientContractDocumentRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th>Contract</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const status = normalizeContractStatus(c.contract_status);
            return (
              <tr key={c.id}>
                <td>
                  <div className="font-medium">{c.contract_name}</div>
                  <div className="text-xs opacity-60">
                    {c.contract_number}
                    {c.client_name ? ` · ${c.client_name}` : ""}
                  </div>
                </td>
                <td>
                  <StatusBadge status={status} />
                  {c.due_at ? (
                    <div className="mt-1 text-xs opacity-60">
                      Due {new Date(c.due_at).toLocaleDateString()}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
                    {c.open_for_signature ? (
                      <Link
                        href={`/app/contracts/${c.id}/sign`}
                        className="btn btn-primary btn-sm"
                      >
                        Review &amp; Sign
                      </Link>
                    ) : (
                      <Link
                        href={`/app/contracts/${c.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        View
                      </Link>
                    )}
                    <ContractPdfButton
                      contract={c}
                      className="btn btn-ghost btn-sm btn-square shrink-0 opacity-60 hover:opacity-100"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
