"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ControlExceptionStatus } from "@/lib/types";

const STATUSES: ControlExceptionStatus[] = [
  "Open",
  "Under Review",
  "Resolved",
];

export function ExceptionStatusForm({
  exceptionId,
  currentStatus,
  reviewers,
}: {
  exceptionId: string;
  currentStatus: ControlExceptionStatus;
  reviewers: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reviewerId, setReviewerId] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("control_exceptions")
      .update({
        status,
        assigned_reviewer_id: reviewerId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exceptionId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="select select-bordered select-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value as ControlExceptionStatus)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="select select-bordered select-sm"
        value={reviewerId}
        onChange={(e) => setReviewerId(e.target.value)}
      >
        <option value="">Reviewer…</option>
        {reviewers.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Saving…" : "Update"}
      </button>
    </div>
  );
}
