import { money } from "@/lib/format";
import type {
  Approval,
  ControlException,
  Cost,
  Invoice,
  Payment,
  Task,
  WorkEntry,
} from "@/lib/types";

export type AuditCategory =
  | "Time"
  | "Task"
  | "Payment"
  | "Invoice"
  | "Approval"
  | "Cost"
  | "Exception";

export const AUDIT_CATEGORIES: AuditCategory[] = [
  "Time",
  "Task",
  "Approval",
  "Cost",
  "Invoice",
  "Payment",
  "Exception",
];

export type AuditEvent = {
  id: string;
  category: AuditCategory;
  occurredAt: string;
  /** Human-readable action, ideally starting with what happened */
  summary: string;
  detail?: string;
  /** Employee who performed the action */
  actorName: string | null;
  actorId: string | null;
  clientId: string | null;
  clientName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  href: string | null;
};

type NameMaps = {
  clients: Map<string, string>;
  campaigns: Map<string, { name: string; clientId: string }>;
  profiles: Map<string, string>;
  invoiceNumbers: Map<string, string>;
};

const MAX_EVENTS = 400;

function sortKey(iso: string) {
  return iso.slice(0, 19);
}

function nameOf(maps: NameMaps, id: string | null | undefined) {
  if (!id) return null;
  return maps.profiles.get(id) ?? null;
}

function hoursLabel(hours: number) {
  const n = Math.round(hours * 100) / 100;
  return `${n}h`;
}

export function buildAuditTrail(input: {
  payments: Payment[];
  invoices: Invoice[];
  approvals: Approval[];
  costs: Cost[];
  exceptions: ControlException[];
  work: WorkEntry[];
  tasks: Pick<
    Task,
    | "id"
    | "title"
    | "status"
    | "assignee_id"
    | "created_by"
    | "campaign_id"
    | "created_at"
    | "submitted_at"
    | "completed_at"
  >[];
  clients: { id: string; client_name: string }[];
  campaigns: {
    id: string;
    campaign_name: string;
    client_id: string;
  }[];
  profiles: { id: string; full_name: string }[];
}): AuditEvent[] {
  const maps: NameMaps = {
    clients: new Map(input.clients.map((c) => [c.id, c.client_name])),
    campaigns: new Map(
      input.campaigns.map((c) => [
        c.id,
        { name: c.campaign_name, clientId: c.client_id },
      ]),
    ),
    profiles: new Map(input.profiles.map((p) => [p.id, p.full_name])),
    invoiceNumbers: new Map(
      input.invoices.map((i) => [i.id, i.invoice_number]),
    ),
  };

  const events: AuditEvent[] = [];

  for (const w of input.work) {
    const who = nameOf(maps, w.user_id) ?? "Unknown employee";
    const camp = maps.campaigns.get(w.campaign_id);
    const clientId = camp?.clientId ?? null;
    events.push({
      id: `work-${w.id}`,
      category: "Time",
      occurredAt: w.work_date || w.created_at,
      summary: `${who} logged ${hoursLabel(w.hours)} · ${w.work_type}`,
      detail:
        [
          w.description || null,
          w.billable ? "Billable" : "Non-billable",
          w.approval_status ? `Status: ${w.approval_status}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      actorName: who,
      actorId: w.user_id,
      clientId,
      clientName: clientId ? (maps.clients.get(clientId) ?? null) : null,
      campaignId: w.campaign_id,
      campaignName: camp?.name ?? null,
      href: "/app/work",
    });
  }

  for (const t of input.tasks) {
    const camp = maps.campaigns.get(t.campaign_id);
    const clientId = camp?.clientId ?? null;
    const assignee = nameOf(maps, t.assignee_id);
    const creator = nameOf(maps, t.created_by);

    if (t.created_by) {
      const who = creator ?? "Unknown employee";
      events.push({
        id: `task-created-${t.id}`,
        category: "Task",
        occurredAt: t.created_at,
        summary: `${who} created task “${t.title}”`,
        detail: assignee ? `Assigned to ${assignee}` : undefined,
        actorName: who,
        actorId: t.created_by,
        clientId,
        clientName: clientId ? (maps.clients.get(clientId) ?? null) : null,
        campaignId: t.campaign_id,
        campaignName: camp?.name ?? null,
        href: `/app/tasks`,
      });
    }

    if (t.submitted_at && t.assignee_id) {
      const who = assignee ?? "Unknown employee";
      events.push({
        id: `task-submitted-${t.id}`,
        category: "Task",
        occurredAt: t.submitted_at,
        summary: `${who} submitted task “${t.title}”`,
        detail: `Status: ${t.status}`,
        actorName: who,
        actorId: t.assignee_id,
        clientId,
        clientName: clientId ? (maps.clients.get(clientId) ?? null) : null,
        campaignId: t.campaign_id,
        campaignName: camp?.name ?? null,
        href: `/app/tasks`,
      });
    }

    if (t.completed_at && t.assignee_id) {
      const who = assignee ?? "Unknown employee";
      events.push({
        id: `task-completed-${t.id}`,
        category: "Task",
        occurredAt: t.completed_at,
        summary: `${who} completed task “${t.title}”`,
        detail: undefined,
        actorName: who,
        actorId: t.assignee_id,
        clientId,
        clientName: clientId ? (maps.clients.get(clientId) ?? null) : null,
        campaignId: t.campaign_id,
        campaignName: camp?.name ?? null,
        href: `/app/tasks`,
      });
    }
  }

  for (const p of input.payments) {
    const invNo = maps.invoiceNumbers.get(p.invoice_id);
    events.push({
      id: `payment-${p.id}`,
      category: "Payment",
      occurredAt: p.payment_date || p.created_at,
      summary: `Payment of ${money(p.amount)}${invNo ? ` on invoice ${invNo}` : ""} recorded`,
      detail: [p.payment_method, p.reference].filter(Boolean).join(" · ") || undefined,
      actorName: null,
      actorId: null,
      clientId: p.client_id,
      clientName: maps.clients.get(p.client_id) ?? null,
      campaignId: null,
      campaignName: null,
      href: "/app/ar",
    });
  }

  for (const i of input.invoices) {
    events.push({
      id: `invoice-${i.id}`,
      category: "Invoice",
      occurredAt: i.invoice_date || i.created_at,
      summary: `Invoice ${i.invoice_number} issued · ${money(i.total_amount)} · ${i.status}`,
      detail: i.disputed ? "Disputed" : undefined,
      actorName: null,
      actorId: null,
      clientId: i.client_id,
      clientName: maps.clients.get(i.client_id) ?? null,
      campaignId: i.campaign_id,
      campaignName: i.campaign_id
        ? (maps.campaigns.get(i.campaign_id)?.name ?? null)
        : null,
      href: "/app/billing",
    });
  }

  for (const a of input.approvals) {
    const requester = nameOf(maps, a.requested_by);
    const approver = nameOf(maps, a.approved_by);

    if (a.requested_by || a.requested_date) {
      const who = requester ?? "Unknown employee";
      events.push({
        id: `approval-requested-${a.id}`,
        category: "Approval",
        occurredAt: a.requested_date || a.created_at,
        summary: `${who} requested ${a.approval_type}`,
        detail: a.description || undefined,
        actorName: requester,
        actorId: a.requested_by,
        clientId: a.client_id,
        clientName: maps.clients.get(a.client_id) ?? null,
        campaignId: a.campaign_id,
        campaignName: maps.campaigns.get(a.campaign_id)?.name ?? null,
        href: `/app/approvals?client=${a.client_id}`,
      });
    }

    if (a.approved_date && a.approved_by) {
      const who = approver ?? "Unknown employee";
      const verb =
        a.approval_status === "Rejected" ||
        a.approval_status === "Changes Requested"
          ? a.approval_status.toLowerCase()
          : "approved";
      events.push({
        id: `approval-decided-${a.id}`,
        category: "Approval",
        occurredAt: a.approved_date,
        summary: `${who} ${verb} ${a.approval_type}`,
        detail: a.description || `Status: ${a.approval_status}`,
        actorName: approver,
        actorId: a.approved_by,
        clientId: a.client_id,
        clientName: maps.clients.get(a.client_id) ?? null,
        campaignId: a.campaign_id,
        campaignName: maps.campaigns.get(a.campaign_id)?.name ?? null,
        href: `/app/approvals?client=${a.client_id}`,
      });
    }
  }

  for (const c of input.costs) {
    const camp = c.campaign_id ? maps.campaigns.get(c.campaign_id) : null;
    const clientId = c.client_id ?? camp?.clientId ?? null;
    events.push({
      id: `cost-${c.id}`,
      category: "Cost",
      occurredAt: c.cost_date || c.created_at,
      summary: `Cost recorded · ${c.cost_type || "Cost"} · ${money(c.amount)}${c.approved ? "" : " · unapproved"}`,
      detail: c.description || c.vendor_name || undefined,
      actorName: null,
      actorId: null,
      clientId,
      clientName: clientId ? (maps.clients.get(clientId) ?? null) : null,
      campaignId: c.campaign_id,
      campaignName: camp?.name ?? null,
      href: c.campaign_id ? `/app/campaigns/${c.campaign_id}` : "/app/costs",
    });
  }

  for (const e of input.exceptions) {
    const reviewerId = e.assigned_reviewer_id;
    const who =
      nameOf(maps, reviewerId) ?? e.profiles?.full_name ?? null;
    events.push({
      id: `exception-${e.id}`,
      category: "Exception",
      occurredAt: e.updated_at || e.detected_at,
      summary: who
        ? `${who} reviewing exception · ${e.exception_type} · ${e.status}`
        : `Control exception · ${e.exception_type} · ${e.status}`,
      detail: e.description || undefined,
      actorName: who,
      actorId: reviewerId,
      clientId: e.client_id,
      clientName:
        e.clients?.client_name ??
        (e.client_id ? (maps.clients.get(e.client_id) ?? null) : null),
      campaignId: null,
      campaignName: null,
      href: e.href ?? "/app/controls",
    });
  }

  return events
    .sort((a, b) => sortKey(b.occurredAt).localeCompare(sortKey(a.occurredAt)))
    .slice(0, MAX_EVENTS);
}
