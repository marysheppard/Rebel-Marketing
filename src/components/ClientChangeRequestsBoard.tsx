"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CLIENT_CHANGE_TYPES,
  PAUSE_CANCEL_ACTIONS,
  SCOPE_ACTIONS,
  STRATEGY_FOCUS_OPTIONS,
  TIMELINE_KINDS,
  changeRequestNotesPreview,
  formatChangeRequestNotes,
  validateChangeRequestDetails,
  type ClientChangeType,
  type ChangeRequestFormDetails,
} from "@/lib/change-requests";
import { EmptyState, StatusBadge } from "@/components/ui";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-error sm:col-span-2 text-sm" role="alert">
      {message}
    </div>
  );
}

export type ChangeRequestCampaign = {
  id: string;
  client_id: string;
  campaign_name: string;
  campaign_status: string;
};

export type ChangeRequestRow = {
  id: string;
  approval_type: string;
  description: string;
  notes: string;
  requested_date: string;
  approval_status: string;
  campaign_name: string;
};

function emptyTypeFields() {
  return {
    desiredBudget: "",
    effectiveDate: "",
    currentBudgetNote: "",
    desiredFocus: "",
    shiftToward: "",
    shiftAwayFrom: "",
    scopeAction: "",
    scopeServices: [] as string[],
    timelineKind: "",
    targetDate: "",
    secondaryDate: "",
    pauseCancelAction: "",
    resumeDate: "",
  };
}

export function ClientChangeRequestsBoard({
  userId,
  campaigns,
  requests,
}: {
  userId: string;
  campaigns: ChangeRequestCampaign[];
  requests: ChangeRequestRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [changeType, setChangeType] = useState<ClientChangeType | "">("");
  const [fields, setFields] = useState(emptyTypeFields);

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) =>
        b.requested_date.localeCompare(a.requested_date),
      ),
    [requests],
  );

  function onChangeType(next: ClientChangeType | "") {
    setChangeType(next);
    setFields(emptyTypeFields());
    setError(null);
  }

  function toggleScopeService(service: string) {
    setFields((prev) => {
      const has = prev.scopeServices.includes(service);
      return {
        ...prev,
        scopeServices: has
          ? prev.scopeServices.filter((s) => s !== service)
          : [...prev.scopeServices, service],
      };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const selectedCampaignId = String(fd.get("campaign_id"));
    const camp = campaigns.find((c) => c.id === selectedCampaignId);
    if (!camp) {
      setError("Please select a campaign.");
      setLoading(false);
      return;
    }

    if (!changeType) {
      setError("Please select a valid change type.");
      setLoading(false);
      return;
    }

    const description = String(fd.get("description")).trim();
    if (!description) {
      setError("Please describe the change you need.");
      setLoading(false);
      return;
    }

    const details: ChangeRequestFormDetails = {
      type: changeType,
      desiredBudget: fields.desiredBudget,
      effectiveDate: fields.effectiveDate,
      currentBudgetNote: fields.currentBudgetNote,
      desiredFocus: fields.desiredFocus,
      shiftToward: fields.shiftToward,
      shiftAwayFrom: fields.shiftAwayFrom,
      scopeAction: fields.scopeAction,
      scopeServices: fields.scopeServices,
      timelineKind: fields.timelineKind,
      targetDate: fields.targetDate,
      secondaryDate: fields.secondaryDate,
      pauseCancelAction: fields.pauseCancelAction,
      resumeDate: fields.resumeDate,
      extraNotes: String(fd.get("notes") ?? "").trim(),
    };

    const validationError = validateChangeRequestDetails(details);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const notes = formatChangeRequestNotes(details);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("approvals").insert({
      campaign_id: selectedCampaignId,
      client_id: camp.client_id,
      approval_type: changeType,
      description,
      requested_date: new Date().toISOString().slice(0, 10),
      approval_status: "Pending",
      requested_by: userId,
      notes,
    });
    setLoading(false);
    if (insertError) {
      setError(
        insertError.message ||
          "Could not submit your change request. Please try again.",
      );
      return;
    }
    (e.target as HTMLFormElement).reset();
    setCampaignId("");
    setChangeType("");
    setFields(emptyTypeFields());
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <h2 className="text-lg font-semibold">New request</h2>
        <p className="mt-1 text-sm opacity-60">
          Ask your account team for a budget increase, strategy shift, scope
          change, timeline update, or to pause a campaign. They will review and
          respond — approving a request records the decision; it does not
          automatically change your contract.
        </p>

        {campaigns.length === 0 ? (
          <p className="mt-4 text-sm opacity-60">
            No campaigns are linked to your account yet. Contact your account
            manager if you need to request a change.
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="form-grid mt-4 grid gap-4 sm:grid-cols-2"
          >
            <FormError message={error} />
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Campaign *</span>
              <select
                name="campaign_id"
                className="select select-bordered w-full"
                required
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Select campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campaign_name}
                    {c.campaign_status ? ` (${c.campaign_status})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Change type *</span>
              <select
                name="approval_type"
                className="select select-bordered w-full"
                required
                value={changeType}
                onChange={(e) =>
                  onChangeType(e.target.value as ClientChangeType | "")
                }
              >
                <option value="" disabled>
                  Select type
                </option>
                {CLIENT_CHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {changeType === "Budget Increase" ? (
              <>
                <label>
                  <span className="text-sm font-medium">Desired budget *</span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. $15,000 / month"
                    value={fields.desiredBudget}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        desiredBudget: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">Effective date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={fields.effectiveDate}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        effectiveDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">
                    Current budget note
                  </span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Optional — what you are spending now"
                    value={fields.currentBudgetNote}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        currentBudgetNote: e.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : null}

            {changeType === "Strategy / Mix" ? (
              <>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">
                    Desired primary focus *
                  </span>
                  <select
                    className="select select-bordered w-full"
                    required
                    value={fields.desiredFocus}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        desiredFocus: e.target.value,
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select focus
                    </option>
                    {STRATEGY_FOCUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">
                    Shift budget toward
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={fields.shiftToward}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        shiftToward: e.target.value,
                      }))
                    }
                  >
                    <option value="">Optional</option>
                    {STRATEGY_FOCUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">
                    Shift budget away from
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={fields.shiftAwayFrom}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        shiftAwayFrom: e.target.value,
                      }))
                    }
                  >
                    <option value="">Optional</option>
                    {STRATEGY_FOCUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {changeType === "Scope Change" ? (
              <>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">Requested action *</span>
                  <select
                    className="select select-bordered w-full"
                    required
                    value={fields.scopeAction}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        scopeAction: e.target.value,
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select action
                    </option>
                    {SCOPE_ACTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium">
                    Services *
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STRATEGY_FOCUS_OPTIONS.map((service) => (
                      <label
                        key={service}
                        className="flex cursor-pointer items-start gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm mt-0.5"
                          checked={fields.scopeServices.includes(service)}
                          onChange={() => toggleScopeService(service)}
                        />
                        <span>{service}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : null}

            {changeType === "Timeline Change" ? (
              <>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">
                    Kind of change *
                  </span>
                  <select
                    className="select select-bordered w-full"
                    required
                    value={fields.timelineKind}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        timelineKind: e.target.value,
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select kind
                    </option>
                    {TIMELINE_KINDS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">New target date *</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    required
                    value={fields.targetDate}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        targetDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">Secondary date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={fields.secondaryDate}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        secondaryDate: e.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : null}

            {changeType === "Pause / Cancel" ? (
              <>
                <label>
                  <span className="text-sm font-medium">Action *</span>
                  <select
                    className="select select-bordered w-full"
                    required
                    value={fields.pauseCancelAction}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        pauseCancelAction: e.target.value,
                        resumeDate:
                          e.target.value === "Cancel" ? "" : f.resumeDate,
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select action
                    </option>
                    {PAUSE_CANCEL_ACTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">Effective date *</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    required
                    value={fields.effectiveDate}
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        effectiveDate: e.target.value,
                      }))
                    }
                  />
                </label>
                {fields.pauseCancelAction === "Pause" ? (
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium">Resume date</span>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={fields.resumeDate}
                      onChange={(e) =>
                        setFields((f) => ({
                          ...f,
                          resumeDate: e.target.value,
                        }))
                      }
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            {changeType ? (
              <>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">Description *</span>
                  <textarea
                    name="description"
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    required
                    placeholder="What do you need changed, and why?"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">Additional notes</span>
                  <textarea
                    name="notes"
                    className="textarea textarea-bordered w-full"
                    rows={2}
                    placeholder="Optional context for your account manager"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Submitting…" : "Submit request"}
                  </button>
                </div>
              </>
            ) : (
              <p className="sm:col-span-2 text-sm opacity-60">
                Select a change type to see the relevant options.
              </p>
            )}
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">My requests</h2>
        {sorted.length === 0 ? (
          <EmptyState
            title="No change requests yet"
            description="Submit a request above when you need more budget, a different marketing mix, or a schedule change."
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((r) => {
              const preview = changeRequestNotesPreview(r.notes);
              return (
                <article
                  key={r.id}
                  className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={r.approval_status} />
                        <span className="text-sm font-medium">
                          {r.approval_type}
                        </span>
                        <span className="text-xs opacity-60">
                          {r.campaign_name} · {r.requested_date}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{r.description}</p>
                      {preview ? (
                        <p className="mt-1 text-xs font-medium opacity-70">
                          {preview}
                        </p>
                      ) : null}
                      {r.notes ? (
                        <p className="mt-2 whitespace-pre-wrap text-xs opacity-60">
                          {r.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
