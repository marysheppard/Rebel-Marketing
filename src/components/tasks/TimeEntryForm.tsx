"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeTotalHours, toDateStr } from "@/lib/time";
import type { Task } from "@/lib/types";

type TaskOption = Pick<
  Task,
  "id" | "title" | "campaign_id" | "status" | "campaigns"
>;

type CampaignOption = {
  id: string;
  label: string;
  clientName?: string;
};

const GENERAL_TASK_TITLE = "General time";

export function TimeEntryForm({
  employeeId,
  tasks,
  campaigns = [],
  initial,
  onDone,
}: {
  employeeId: string;
  tasks: TaskOption[];
  campaigns?: CampaignOption[];
  initial?: {
    id: string;
    task_id: string;
    work_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    description: string;
  } | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const initialTask = tasks.find((t) => t.id === initial?.task_id);
  const [campaignId, setCampaignId] = useState(
    initialTask?.campaign_id ?? "",
  );
  const [taskId, setTaskId] = useState(initial?.task_id ?? "");
  const [workDate, setWorkDate] = useState(
    initial?.work_date ?? toDateStr(new Date()),
  );
  const [startTime, setStartTime] = useState(
    (initial?.start_time ?? "09:00").slice(0, 5),
  );
  const [endTime, setEndTime] = useState(
    (initial?.end_time ?? "17:00").slice(0, 5),
  );
  const [breakMinutes, setBreakMinutes] = useState(
    initial?.break_minutes ?? 0,
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const campaignTasks = useMemo(
    () =>
      campaignId
        ? tasks.filter((t) => t.campaign_id === campaignId)
        : tasks,
    [tasks, campaignId],
  );

  const selectedTask = tasks.find((t) => t.id === taskId);
  const selectedCampaign = campaigns.find((c) => c.id === campaignId);
  const totalHours = useMemo(
    () => computeTotalHours(startTime, endTime, Number(breakMinutes) || 0),
    [startTime, endTime, breakMinutes],
  );

  const clientProjectLabel = selectedTask
    ? `${selectedTask.campaigns?.clients?.client_name ?? "—"}${
        selectedTask.campaigns?.campaign_name
          ? ` · ${selectedTask.campaigns.campaign_name}`
          : ""
      }`
    : selectedCampaign
      ? `${selectedCampaign.clientName ? `${selectedCampaign.clientName} · ` : ""}${selectedCampaign.label}`
      : "—";

  async function ensureTaskId(
    supabase: ReturnType<typeof createClient>,
    forCampaignId: string,
    preferredTaskId: string,
  ): Promise<{ id: string | null; error: string | null }> {
    if (preferredTaskId) return { id: preferredTaskId, error: null };

    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("campaign_id", forCampaignId)
      .eq("assignee_id", employeeId)
      .eq("title", GENERAL_TASK_TITLE)
      .neq("status", "Completed")
      .limit(1)
      .maybeSingle();

    if (existing?.id) return { id: existing.id, error: null };

    const { data: created, error: createError } = await supabase
      .from("tasks")
      .insert({
        campaign_id: forCampaignId,
        assignee_id: employeeId,
        created_by: employeeId,
        title: GENERAL_TASK_TITLE,
        description: "Auto-created for time logging without a specific task.",
        status: "In Progress",
        priority: "Medium",
        estimated_hours: 0,
        assigned_date: toDateStr(new Date()),
        notes: "",
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      return {
        id: null,
        error: createError?.message || "Could not create a general time task.",
      };
    }
    return { id: created.id, error: null };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const resolvedCampaignId =
      campaignId || selectedTask?.campaign_id || "";
    if (!resolvedCampaignId && !taskId) {
      setError("Select a campaign.");
      return;
    }
    if (totalHours === null) {
      setError(
        "End time must be after start time, and break cannot exceed the shift.",
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { id: resolvedTaskId, error: taskError } = await ensureTaskId(
      supabase,
      resolvedCampaignId || selectedTask!.campaign_id,
      taskId,
    );
    if (taskError || !resolvedTaskId) {
      setLoading(false);
      setError(taskError || "Could not resolve task.");
      return;
    }

    const payload = {
      employee_id: employeeId,
      task_id: resolvedTaskId,
      work_date: workDate,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      break_minutes: Number(breakMinutes) || 0,
      total_hours: totalHours,
      description: description.trim(),
    };

    let workEntryId: string | null = null;
    if (!initial?.id) {
      const campaignForWork =
        resolvedCampaignId ||
        tasks.find((t) => t.id === resolvedTaskId)?.campaign_id;
      if (campaignForWork) {
        const { data: workRow } = await supabase
          .from("work_entries")
          .insert({
            campaign_id: campaignForWork,
            user_id: employeeId,
            work_date: workDate,
            work_type: "Account",
            description: description.trim() || GENERAL_TASK_TITLE,
            hours: totalHours,
            billable: true,
            approval_status: "Pending",
            billed: false,
            task_id: resolvedTaskId,
          })
          .select("id")
          .single();
        workEntryId = workRow?.id ?? null;
      }
    }

    const { error: saveError } = initial?.id
      ? await supabase.from("time_entries").update(payload).eq("id", initial.id)
      : await supabase.from("time_entries").insert({
          ...payload,
          work_entry_id: workEntryId,
        });

    setLoading(false);
    if (saveError) {
      setError(saveError.message || "Could not save time entry.");
      return;
    }
    setSuccess(initial?.id ? "Time entry updated." : "Time logged.");
    if (!initial?.id) {
      setDescription("");
      setBreakMinutes(0);
      setTaskId("");
    }
    router.refresh();
    onDone?.();
  }

  const showCampaignSelect = campaigns.length > 0 || !initial?.id;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {error ? (
        <div className="alert alert-error sm:col-span-2 py-2 text-sm">{error}</div>
      ) : null}
      {success ? (
        <div className="alert alert-success sm:col-span-2 py-2 text-sm">
          {success}
        </div>
      ) : null}

      {showCampaignSelect ? (
        <label className="sm:col-span-2">
          <span className="text-sm font-medium">Campaign *</span>
          <select
            className="select select-bordered mt-1 w-full"
            required={!taskId}
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value);
              setTaskId("");
            }}
          >
            <option value="">Select campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName ? `${c.clientName} · ` : ""}
                {c.label}
              </option>
            ))}
            {!campaigns.some((c) => c.id === campaignId) && campaignId ? (
              <option value={campaignId}>
                {selectedTask?.campaigns?.campaign_name ?? "Current campaign"}
              </option>
            ) : null}
          </select>
        </label>
      ) : null}

      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Task</span>
        <select
          className="select select-bordered mt-1 w-full"
          value={taskId}
          onChange={(e) => {
            const next = e.target.value;
            setTaskId(next);
            const t = tasks.find((row) => row.id === next);
            if (t?.campaign_id) setCampaignId(t.campaign_id);
          }}
        >
          <option value="">General time (no specific task)</option>
          {campaignTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {t.status === "Completed" ? " (completed)" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-sm sm:col-span-2">
        <div className="opacity-60">Client / project</div>
        <div className="font-medium">{clientProjectLabel}</div>
      </div>

      <label>
        <span className="text-sm font-medium">Date *</span>
        <input
          type="date"
          className="input input-bordered mt-1 w-full"
          required
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
        />
      </label>

      <div className="rounded-box border border-base-300 bg-base-200/40 p-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Total hours
        </div>
        <div className="text-2xl font-bold">
          {totalHours === null ? "—" : totalHours.toFixed(2)}
        </div>
      </div>

      <label>
        <span className="text-sm font-medium">Start *</span>
        <input
          type="time"
          className="input input-bordered mt-1 w-full"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </label>

      <label>
        <span className="text-sm font-medium">End *</span>
        <input
          type="time"
          className="input input-bordered mt-1 w-full"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </label>

      <label>
        <span className="text-sm font-medium">Break (minutes)</span>
        <input
          type="number"
          min={0}
          className="input input-bordered mt-1 w-full"
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(Number(e.target.value) || 0)}
        />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm font-medium">Description</span>
        <textarea
          className="textarea textarea-bordered mt-1 w-full"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
        />
      </label>

      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : initial?.id ? "Update entry" : "Log time"}
        </button>
      </div>
    </form>
  );
}
