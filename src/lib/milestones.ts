import { daysBetween, num } from "@/lib/format";
import type { CampaignMilestone, MilestoneStatus } from "@/lib/types";

export type MilestoneLike = {
  id: string;
  campaign_id: string;
  contract_id?: string | null;
  sequence: number;
  name: string;
  recognition_amount: number | string;
  target_date: string | null;
  completed_at?: string | null;
  approved_at?: string | null;
  status: string;
  billable?: boolean;
  billed?: boolean;
  invoice_id?: string | null;
  notes?: string;
};

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  "Planned",
  "In Progress",
  "Complete",
  "Approved",
  "Waived",
];

/** Staff may mark operational progress (not approval). */
export function canCompleteMilestoneTransition(
  from: string,
  to: MilestoneStatus,
) {
  if (to === "In Progress") {
    return from === "Planned" || from === "In Progress";
  }
  if (to === "Complete") {
    return (
      from === "Planned" || from === "In Progress" || from === "Complete"
    );
  }
  return false;
}

/** AM / agency manager approval. */
export function canApproveMilestoneTransition(from: string, to: MilestoneStatus) {
  if (to === "Approved") {
    return from === "Complete" || from === "Approved" || from === "In Progress";
  }
  if (to === "Waived") {
    return from !== "Approved";
  }
  return false;
}

export function isMilestoneRecognized(status: string) {
  return status === "Approved";
}

export function sumMilestonePlan(milestones: MilestoneLike[]) {
  return milestones.reduce((s, m) => s + num(m.recognition_amount), 0);
}

export function sumRecognized(milestones: MilestoneLike[]) {
  return milestones
    .filter((m) => isMilestoneRecognized(m.status))
    .reduce((s, m) => s + num(m.recognition_amount), 0);
}

export function sumBilledMilestones(milestones: MilestoneLike[]) {
  return milestones
    .filter((m) => m.billed)
    .reduce((s, m) => s + num(m.recognition_amount), 0);
}

export function readyToBillMilestones(milestones: MilestoneLike[]) {
  return milestones.filter(
    (m) =>
      m.status === "Approved" &&
      m.billable !== false &&
      !m.billed,
  );
}

export function nextMilestone(milestones: MilestoneLike[]) {
  const open = [...milestones]
    .filter((m) => !["Approved", "Waived"].includes(m.status))
    .sort((a, b) => a.sequence - b.sequence);
  return open[0] ?? null;
}

/** Days from today to target (negative = late). */
export function daysUntilTarget(
  targetDate: string | null | undefined,
  asOf: Date = new Date(),
) {
  if (!targetDate) return null;
  return daysBetween(asOf, targetDate);
}

export function daysLate(
  targetDate: string | null | undefined,
  asOf: Date = new Date(),
) {
  const d = daysUntilTarget(targetDate, asOf);
  if (d == null) return null;
  return d < 0 ? Math.abs(d) : 0;
}

export function schedulePctComplete(milestones: MilestoneLike[]) {
  if (!milestones.length) return null;
  const done = milestones.filter((m) =>
    ["Approved", "Waived", "Complete"].includes(m.status),
  ).length;
  return (done / milestones.length) * 100;
}

export function revenuePctRecognized(milestones: MilestoneLike[]) {
  const plan = sumMilestonePlan(milestones);
  if (plan <= 0) return null;
  return (sumRecognized(milestones) / plan) * 100;
}

export function recognitionBase(input: {
  project_fee?: number | string | null;
  campaign_budget?: number | string | null;
  contract_project_fee?: number | string | null;
}) {
  const fee = num(input.project_fee);
  if (fee > 0) return fee;
  const contractFee = num(input.contract_project_fee);
  if (contractFee > 0) return contractFee;
  const budget = num(input.campaign_budget);
  if (budget > 0) return budget;
  return sumMilestonePlan([]);
}

export function milestonesByContract(
  milestones: MilestoneLike[],
  campaigns: { id: string; contract_id: string }[],
) {
  const contractByCampaign = new Map(
    campaigns.map((c) => [c.id, c.contract_id]),
  );
  const map = new Map<string, MilestoneLike[]>();
  for (const m of milestones) {
    const cid =
      m.contract_id || contractByCampaign.get(m.campaign_id) || "";
    if (!cid) continue;
    const list = map.get(cid) ?? [];
    list.push(m);
    map.set(cid, list);
  }
  return map;
}

export function mapMilestoneRow(row: Record<string, unknown>): CampaignMilestone {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    contract_id: row.contract_id ? String(row.contract_id) : null,
    sequence: Number(row.sequence ?? 0),
    name: String(row.name ?? ""),
    recognition_amount: num(row.recognition_amount),
    target_date: row.target_date ? String(row.target_date) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    approved_at: row.approved_at ? String(row.approved_at) : null,
    status: String(row.status ?? "Planned") as CampaignMilestone["status"],
    billable: Boolean(row.billable ?? true),
    billed: Boolean(row.billed ?? false),
    invoice_id: row.invoice_id ? String(row.invoice_id) : null,
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}
