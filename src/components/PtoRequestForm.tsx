"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { num } from "@/lib/format";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-error text-sm">{message}</div>;
}

function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-success text-sm">{message}</div>;
}

export function PtoRequestForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const start_date = String(fd.get("start_date") ?? "");
    const end_date = String(fd.get("end_date") ?? "");
    const hours = num(fd.get("hours"));
    const reason = String(fd.get("reason") ?? "").trim();

    if (!start_date || !end_date) {
      setError("Start and end dates are required.");
      setLoading(false);
      return;
    }
    if (end_date < start_date) {
      setError("End date must be on or after the start date.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("pto_requests").insert({
      user_id: userId,
      start_date,
      end_date,
      hours: hours || 8,
      reason,
      status: "Pending",
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message || "Could not submit PTO request.");
      return;
    }
    setSuccess("PTO request submitted.");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="form-grid grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <FormError message={error} />
      <FormSuccess message={success} />
      <label>
        <span className="text-sm font-medium">Start date</span>
        <input
          name="start_date"
          type="date"
          className="input input-bordered w-full"
          required
        />
      </label>
      <label>
        <span className="text-sm font-medium">End date</span>
        <input
          name="end_date"
          type="date"
          className="input input-bordered w-full"
          required
        />
      </label>
      <label>
        <span className="text-sm font-medium">Hours</span>
        <input
          name="hours"
          type="number"
          min="0"
          step="0.5"
          defaultValue={8}
          className="input input-bordered w-full"
          required
        />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Reason</span>
        <textarea
          name="reason"
          className="textarea textarea-bordered w-full"
          rows={2}
          placeholder="Vacation, appointment, personal day…"
        />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Submitting…" : "Request PTO"}
        </button>
      </div>
    </form>
  );
}
