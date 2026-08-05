import Link from "next/link";
import { ClientIntakeForm } from "@/components/ClientIntakeForm";
import { PageHeader } from "@/components/ui";
import { canManageClients, getProfile } from "@/lib/page-auth";
import { redirect } from "next/navigation";

export default async function ClientIntakePage() {
  const { supabase, profile } = await getProfile();
  if (!profile) return null;
  if (!canManageClients(profile.role)) redirect("/app/clients");

  const { data: managers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["agency_manager", "account_manager"]);

  return (
    <div>
      <PageHeader
        title="New Client Intake"
        subtitle="Client profile only — identity, contacts, needs, and estimates. Commercial terms belong in Contract Builder."
        actions={
          <Link href="/app/clients" className="btn btn-ghost btn-sm">
            ← Clients
          </Link>
        }
      />
      <ClientIntakeForm
        accountManagers={(managers ?? []).map((m) => ({
          id: m.id,
          label: m.full_name,
        }))}
      />
    </div>
  );
}
