import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmitTaskForm, UpdateTaskStatusForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { num } from "@/lib/format";
import {
  getProfile,
  isClientRole,
  isEmployeeWorkRole,
} from "@/lib/page-auth";

type Params = { params: Promise<{ id: string }> };

export default async function TaskDetailPage({ params }: Params) {
  const { id } = await params;
  const { supabase, profile, userId } = await getProfile();
  if (!profile || !userId) return null;
  if (isClientRole(profile.role) || !isEmployeeWorkRole(profile.role)) {
    redirect("/app");
  }

  const { data: task } = await supabase
    .from("tasks")
    .select(
      `id, title, description, due_date, status, priority, deliverable_notes, deliverable_url,
       submitted_at, assignee_id, campaign_id,
       campaigns(
         campaign_name, description, client_id, contract_id,
         clients(client_name),
         contracts(contract_name, contract_number, scope, included_hours_monthly)
       )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!task) notFound();
  if (task.assignee_id !== userId) {
    redirect("/app/tasks");
  }

  const campRaw = task.campaigns as unknown;
  const camp = Array.isArray(campRaw)
    ? (campRaw[0] as Record<string, unknown> | undefined)
    : (campRaw as Record<string, unknown> | null | undefined);
  const clientsRaw = camp?.clients as unknown;
  const client = Array.isArray(clientsRaw)
    ? (clientsRaw[0] as { client_name?: string } | undefined)
    : (clientsRaw as { client_name?: string } | null | undefined);
  const contractsRaw = camp?.contracts as unknown;
  const contract = Array.isArray(contractsRaw)
    ? (contractsRaw[0] as Record<string, unknown> | undefined)
    : (contractsRaw as Record<string, unknown> | null | undefined);

  const { data: relatedWork } = await supabase
    .from("work_entries")
    .select(
      "id, work_date, hours, description, billable, out_of_scope, retainer_bucket",
    )
    .eq("task_id", id)
    .order("work_date", { ascending: false });

  const canEdit =
    task.status !== "Approved" && isEmployeeWorkRole(profile.role);

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdue =
    task.due_date &&
    String(task.due_date) < todayStr &&
    task.status !== "Submitted" &&
    task.status !== "Approved";

  return (
    <div>
      <PageHeader
        title={task.title}
        subtitle="Task detail, requirements, and deliverable submission"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={String(task.status)} />
        <StatusBadge status={String(task.priority ?? "Medium")} />
        {overdue ? <span className="badge badge-error">Overdue</span> : null}
        {task.status === "Submitted" ? (
          <span className="badge badge-warning badge-outline">
            Awaiting approval
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-3 text-lg font-bold">Details</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="opacity-60">Campaign</dt>
              <dd>
                <Link
                  href={`/app/campaigns/${task.campaign_id}`}
                  className="link link-hover font-medium"
                >
                  {String(camp?.campaign_name ?? "—")}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="opacity-60">Client</dt>
              <dd>{client?.client_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="opacity-60">Contract</dt>
              <dd>
                {contract
                  ? `${String(contract.contract_name)} (${String(contract.contract_number)})`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="opacity-60">Due date</dt>
              <dd className={overdue ? "font-medium text-error" : ""}>
                {task.due_date ? String(task.due_date) : "—"}
              </dd>
            </div>
            <div>
              <dt className="opacity-60">Description</dt>
              <dd className="whitespace-pre-wrap">
                {task.description || "No description provided."}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-3 text-lg font-bold">Requirements & scope</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium opacity-70">Campaign brief</h3>
              <p className="mt-1 whitespace-pre-wrap">
                {String(camp?.description || "No campaign description.")}
              </p>
            </div>
            <div>
              <h3 className="font-medium opacity-70">Contract scope</h3>
              <p className="mt-1 whitespace-pre-wrap">
                {String(contract?.scope || "No contract scope on file.")}
              </p>
            </div>
            {num(contract?.included_hours_monthly) > 0 ? (
              <p className="opacity-70">
                Retainer includes {num(contract?.included_hours_monthly)} hours /
                month (for time-entry classification — not billed here).
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {canEdit ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-box border border-base-300 bg-base-100 p-5">
            <h2 className="mb-4 text-lg font-bold">Update status</h2>
            <p className="mb-3 text-sm opacity-70">
              You can move work forward, but you cannot mark it Approved —
              that stays with account managers / clients.
            </p>
            <UpdateTaskStatusForm
              taskId={task.id}
              currentStatus={String(task.status)}
            />
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-5">
            <h2 className="mb-4 text-lg font-bold">Submit deliverable</h2>
            <p className="mb-3 text-sm opacity-70">
              Submitting sets status to Submitted and flags the task as awaiting
              approval.
            </p>
            <SubmitTaskForm
              taskId={task.id}
              defaultNotes={String(task.deliverable_notes ?? "")}
              defaultUrl={String(task.deliverable_url ?? "")}
            />
          </div>
        </section>
      ) : null}

      {(task.deliverable_notes || task.deliverable_url || task.submitted_at) && (
        <section className="mt-8 rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-3 text-lg font-bold">Submission</h2>
          <dl className="space-y-2 text-sm">
            {task.submitted_at ? (
              <div>
                <dt className="opacity-60">Submitted at</dt>
                <dd>{new Date(String(task.submitted_at)).toLocaleString()}</dd>
              </div>
            ) : null}
            {task.deliverable_url ? (
              <div>
                <dt className="opacity-60">Deliverable link / reference</dt>
                <dd>
                  <a
                    href={String(task.deliverable_url)}
                    className="link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {String(task.deliverable_url)}
                  </a>
                </dd>
              </div>
            ) : null}
            {task.deliverable_notes ? (
              <div>
                <dt className="opacity-60">Notes</dt>
                <dd className="whitespace-pre-wrap">
                  {String(task.deliverable_notes)}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-bold">Related time entries</h2>
          <Link href="/app/work" className="link link-hover text-sm">
            Log time
          </Link>
        </div>
        {!relatedWork?.length ? (
          <EmptyState
            title="No time logged on this task yet"
            description="Log hours from Work and optionally link them to this task."
          />
        ) : (
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Description</th>
                  <th>Billable</th>
                  <th>Retainer</th>
                  <th>Out of scope</th>
                </tr>
              </thead>
              <tbody>
                {relatedWork.map((w) => (
                  <tr key={w.id}>
                    <td>{w.work_date}</td>
                    <td>{num(w.hours)}</td>
                    <td className="max-w-xs truncate">{w.description || "—"}</td>
                    <td>{w.billable ? "Yes" : "No"}</td>
                    <td>{w.retainer_bucket}</td>
                    <td>{w.out_of_scope ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
