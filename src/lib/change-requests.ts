/** Client-initiated change requests stored as `approvals` rows. */

import { MARKETING_SERVICES } from "@/lib/client-intake";

export const CLIENT_CHANGE_TYPES = [
  "Budget Increase",
  "Strategy / Mix",
  "Scope Change",
  "Timeline Change",
  "Pause / Cancel",
] as const;

export type ClientChangeType = (typeof CLIENT_CHANGE_TYPES)[number];

export const STRATEGY_FOCUS_OPTIONS = MARKETING_SERVICES;

export const SCOPE_ACTIONS = [
  "Add services",
  "Remove services",
  "Both",
] as const;

export const TIMELINE_KINDS = [
  "Extend end date",
  "Move start earlier",
  "Delay start",
] as const;

export const PAUSE_CANCEL_ACTIONS = ["Pause", "Cancel"] as const;

export function isClientChangeType(type: string): boolean {
  return (CLIENT_CHANGE_TYPES as readonly string[]).includes(type);
}

export type ChangeRequestFormDetails = {
  type: ClientChangeType;
  /** Budget Increase */
  desiredBudget?: string;
  effectiveDate?: string;
  currentBudgetNote?: string;
  /** Strategy / Mix */
  desiredFocus?: string;
  shiftToward?: string;
  shiftAwayFrom?: string;
  /** Scope Change */
  scopeAction?: string;
  scopeServices?: string[];
  /** Timeline Change */
  timelineKind?: string;
  targetDate?: string;
  secondaryDate?: string;
  /** Pause / Cancel */
  pauseCancelAction?: string;
  resumeDate?: string;
  /** Shared */
  extraNotes?: string;
};

export function validateChangeRequestDetails(
  details: ChangeRequestFormDetails,
): string | null {
  switch (details.type) {
    case "Budget Increase":
      if (!details.desiredBudget?.trim()) {
        return "Please enter your desired budget.";
      }
      return null;
    case "Strategy / Mix":
      if (!details.desiredFocus?.trim()) {
        return "Please choose a desired primary focus.";
      }
      return null;
    case "Scope Change":
      if (!details.scopeAction?.trim()) {
        return "Please choose whether you want to add, remove, or both.";
      }
      if (!details.scopeServices?.length) {
        return "Please select at least one service.";
      }
      return null;
    case "Timeline Change":
      if (!details.timelineKind?.trim()) {
        return "Please choose the kind of timeline change.";
      }
      if (!details.targetDate?.trim()) {
        return "Please choose a new target date.";
      }
      return null;
    case "Pause / Cancel":
      if (!details.pauseCancelAction?.trim()) {
        return "Please choose Pause or Cancel.";
      }
      if (!details.effectiveDate?.trim()) {
        return "Please choose an effective date.";
      }
      return null;
    default:
      return "Please select a valid change type.";
  }
}

/** Build structured notes lines for the approvals.notes column. */
export function formatChangeRequestNotes(
  details: ChangeRequestFormDetails,
): string {
  const lines: string[] = [];

  switch (details.type) {
    case "Budget Increase":
      if (details.desiredBudget?.trim()) {
        lines.push(`Desired budget: ${details.desiredBudget.trim()}`);
      }
      if (details.effectiveDate?.trim()) {
        lines.push(`Effective date: ${details.effectiveDate.trim()}`);
      }
      if (details.currentBudgetNote?.trim()) {
        lines.push(`Current budget note: ${details.currentBudgetNote.trim()}`);
      }
      break;
    case "Strategy / Mix":
      if (details.desiredFocus?.trim()) {
        lines.push(`Desired focus: ${details.desiredFocus.trim()}`);
      }
      if (details.shiftToward?.trim()) {
        lines.push(`Shift budget toward: ${details.shiftToward.trim()}`);
      }
      if (details.shiftAwayFrom?.trim()) {
        lines.push(`Shift budget away from: ${details.shiftAwayFrom.trim()}`);
      }
      break;
    case "Scope Change":
      if (details.scopeAction?.trim()) {
        lines.push(`Scope action: ${details.scopeAction.trim()}`);
      }
      if (details.scopeServices?.length) {
        lines.push(`Services: ${details.scopeServices.join(", ")}`);
      }
      break;
    case "Timeline Change":
      if (details.timelineKind?.trim()) {
        lines.push(`Timeline change: ${details.timelineKind.trim()}`);
      }
      if (details.targetDate?.trim()) {
        lines.push(`Target date: ${details.targetDate.trim()}`);
      }
      if (details.secondaryDate?.trim()) {
        lines.push(`Secondary date: ${details.secondaryDate.trim()}`);
      }
      break;
    case "Pause / Cancel":
      if (details.pauseCancelAction?.trim()) {
        lines.push(`Action: ${details.pauseCancelAction.trim()}`);
      }
      if (details.effectiveDate?.trim()) {
        lines.push(`Effective date: ${details.effectiveDate.trim()}`);
      }
      if (
        details.pauseCancelAction === "Pause" &&
        details.resumeDate?.trim()
      ) {
        lines.push(`Resume date: ${details.resumeDate.trim()}`);
      }
      break;
  }

  if (details.extraNotes?.trim()) {
    lines.push(details.extraNotes.trim());
  }

  return lines.join("\n");
}

/** First structured line for list cards (skips free-form trailing notes when possible). */
export function changeRequestNotesPreview(notes: string): string | null {
  const first = notes
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return first ?? null;
}
