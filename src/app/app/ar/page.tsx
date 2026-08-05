import { Suspense } from "react";
import { RecordPaymentForm } from "@/components/forms";
import { ArDashboard } from "@/components/ar/ArDashboard";
import { remainingBalance } from "@/lib/finance";
import { canRecordPayments, getProfile } from "@/lib/page-auth";
import type { ArInvoiceRow } from "@/lib/ar/calculations";

export default async function ArPage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;

  const [{ data: invoices }, { data: clients }, { data: managers }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "*, clients(client_name, account_manager_id), payments(amount, payment_date)",
        )
        .order("due_date", { ascending: true }),
      supabase
        .from("clients")
        .select("id, client_name, account_manager_id")
        .order("client_name"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["account_manager", "agency_manager"])
        .order("full_name"),
    ]);

  const invoiceRows = (invoices ?? []) as ArInvoiceRow[];

  const open = invoiceRows.filter(
    (i) =>
      remainingBalance(i) > 0 &&
      !["Draft", "Canceled", "Paid"].includes(i.status),
  );

  const payableInvoices = open.map((i) => ({
    id: i.id,
    client_id: i.client_id,
    label: `${i.invoice_number} — ${i.clients?.client_name ?? "Client"}`,
    remaining: remainingBalance(i),
  }));

  const showForm = canRecordPayments(profile.role);

  const clientOptions = (clients ?? []).map((c) => ({
    id: c.id,
    label: c.client_name,
  }));

  const managerOptions = (managers ?? []).map((m) => ({
    id: m.id,
    label: m.full_name,
  }));

  return (
    <div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-28 w-full" />
              ))}
            </div>
            <div className="skeleton h-64 w-full" />
          </div>
        }
      >
        <ArDashboard
          invoices={invoiceRows}
          clients={clientOptions}
          accountManagers={managerOptions}
          showRecordPayment={showForm && payableInvoices.length > 0}
        />
      </Suspense>

      {showForm && payableInvoices.length > 0 ? (
        <section
          id="record-payment"
          className="mt-8 scroll-mt-24 rounded-box border border-base-300 bg-base-100 p-6"
        >
          <h2 className="mb-4 text-xl font-bold">Record payment</h2>
          <RecordPaymentForm invoices={payableInvoices} />
        </section>
      ) : null}
    </div>
  );
}
