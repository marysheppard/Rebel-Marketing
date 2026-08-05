"use client";

import { normalizeContractStatus } from "@/lib/contract-status";

type Event = {
  label: string;
  at?: string | null;
  done: boolean;
  current?: boolean;
};

export function ContractTimeline({
  contractStatus,
  finalizedAt,
  clientSignedAt,
  agencySignedAt,
  fullyExecutedAt,
  declinedAt,
  requestStatus,
  viewedAt,
  sentAt,
}: {
  contractStatus: string;
  finalizedAt?: string | null;
  clientSignedAt?: string | null;
  agencySignedAt?: string | null;
  fullyExecutedAt?: string | null;
  declinedAt?: string | null;
  requestStatus?: string | null;
  viewedAt?: string | null;
  sentAt?: string | null;
}) {
  const status = normalizeContractStatus(contractStatus);
  const declined = status === "Client Declined" || requestStatus === "Declined";

  const events: Event[] = [
    {
      label: "Draft",
      done: true,
      current: status === "Draft",
    },
    {
      label: "Finalized",
      at: finalizedAt,
      done: !!finalizedAt || !["Draft"].includes(status),
      current: status === "Finalized",
    },
    {
      label: "Sent to client",
      at: sentAt,
      done: !!sentAt || [
        "Awaiting Client Signature",
        "Awaiting Agency Signature",
        "Fully Executed",
        "Active",
        "Client Declined",
      ].includes(status),
      current: status === "Awaiting Client Signature" && requestStatus === "Sent",
    },
    {
      label: "Viewed",
      at: viewedAt,
      done: !!viewedAt || ["Awaiting Agency Signature", "Fully Executed", "Active"].includes(status),
      current: requestStatus === "Viewed",
    },
  ];

  if (declined) {
    events.push({
      label: "Client declined",
      at: declinedAt,
      done: true,
      current: true,
    });
  } else {
    events.push(
      {
        label: "Client signed",
        at: clientSignedAt,
        done: !!clientSignedAt,
        current: status === "Awaiting Agency Signature",
      },
      {
        label: "Agency countersigned",
        at: agencySignedAt,
        done: !!agencySignedAt,
        current: false,
      },
      {
        label: "Fully executed",
        at: fullyExecutedAt || agencySignedAt,
        done: ["Fully Executed", "Active"].includes(status),
        current: status === "Fully Executed" || status === "Active",
      },
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-base-300 pl-4">
      {events.map((ev) => (
        <li key={ev.label} className="relative">
          <span
            className={`absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full ${
              ev.current
                ? "bg-primary"
                : ev.done
                  ? "bg-success"
                  : "bg-base-300"
            }`}
          />
          <div className="text-sm font-medium">{ev.label}</div>
          {ev.at ? (
            <div className="text-xs opacity-60">{new Date(ev.at).toLocaleString()}</div>
          ) : (
            <div className="text-xs opacity-40">{ev.done ? "Complete" : "Pending"}</div>
          )}
        </li>
      ))}
    </ol>
  );
}
