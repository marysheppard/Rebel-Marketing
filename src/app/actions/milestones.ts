"use server";

import { revalidatePath } from "next/cache";
import {
  canApproveMilestoneTransition,
  canCompleteMilestoneTransition,
} from "@/lib/milestones";
import {
  canApproveTasks,
  canLogWork,
  getProfile,
} from "@/lib/page-auth";
import type { MilestoneStatus } from "@/lib/types";

export type MilestoneActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateMilestoneStatus(
  milestoneId: string,
  nextStatus: MilestoneStatus,
): Promise<MilestoneActionResult> {
  const id = String(milestoneId ?? "").trim();
  if (!id) return { ok: false, error: "Milestone is required." };

  const { supabase, profile } = await getProfile();
  if (!profile) return { ok: false, error: "Not authenticated." };

  const { data: row, error: loadErr } = await supabase
    .from("campaign_milestones")
    .select("id, status, campaign_id")
    .eq("id", id)
    .single();

  if (loadErr || !row) {
    return {
      ok: false,
      error:
        "Could not load milestone. Apply supabase/seed_campaign_milestones.sql if the table is missing.",
    };
  }

  const from = String(row.status);
  const to = nextStatus;

  if (to === "Approved" || to === "Waived") {
    if (!canApproveTasks(profile.role)) {
      return { ok: false, error: "Only account or agency managers can approve milestones." };
    }
    if (!canApproveMilestoneTransition(from, to)) {
      return {
        ok: false,
        error: `Cannot change status from ${from} to ${to}.`,
      };
    }
  } else {
    if (!canLogWork(profile.role)) {
      return {
        ok: false,
        error: "You do not have permission to update this milestone.",
      };
    }
    if (!canCompleteMilestoneTransition(from, to)) {
      return {
        ok: false,
        error: `Cannot change status from ${from} to ${to}.`,
      };
    }
  }

  const patch: Record<string, unknown> = { status: to };
  if (to === "Complete" || to === "In Progress") {
    if (to === "Complete") {
      patch.completed_at = new Date().toISOString();
    }
  }
  if (to === "Approved") {
    patch.approved_at = new Date().toISOString();
    if (!row.status || from !== "Complete") {
      // keep completed_at if already set; else stamp now
      patch.completed_at = new Date().toISOString();
    }
  }

  const { error: updErr } = await supabase
    .from("campaign_milestones")
    .update(patch)
    .eq("id", id);

  if (updErr) {
    return { ok: false, error: "Could not update milestone." };
  }

  revalidatePath(`/app/campaigns/${row.campaign_id}`);
  revalidatePath("/app/billing");
  revalidatePath("/app/accounting");
  revalidatePath("/app/controls");

  return { ok: true };
}
