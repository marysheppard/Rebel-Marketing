import { redirect } from "next/navigation";
import { ClientSignForm } from "@/components/ClientSignForm";
import { getSigningInviteToken } from "@/lib/signing-invite-session";
import { createClient } from "@/lib/supabase/server";

export default async function SignRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const token = await getSigningInviteToken();
  if (!token) {
    redirect("/sign/access");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_signing_invite_session", {
    p_token: token,
  });

  const session = data as {
    ok?: boolean;
    error?: string;
    message?: string;
    signature_request_id?: string;
    contract_id?: string;
    client_name?: string;
    contact_name?: string;
    contract_name?: string;
    contract_number?: string;
    agreement_html?: string;
    agency_message?: string;
    due_at?: string;
  } | null;

  if (error || !session?.ok) {
    redirect(
      `/sign/access?error=${encodeURIComponent(session?.message || "Session expired.")}`,
    );
  }

  if (session.signature_request_id !== requestId) {
    redirect("/sign/access?error=" + encodeURIComponent("Session does not match this agreement."));
  }

  await supabase.rpc("mark_signing_invite_viewed", { p_token: token });

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-primary">Rebel Marketing</p>
      <h1 className="mt-2 text-3xl font-semibold">{session.contract_name}</h1>
      <p className="mt-1 text-sm opacity-70">
        {session.contract_number} · {session.client_name}
        {session.due_at
          ? ` · Due ${new Date(session.due_at).toLocaleDateString()}`
          : ""}
      </p>
      <p className="mt-2 text-xs opacity-60">
        Temporary signing access — this page does not open your full client portal.
      </p>

      <article
        className="prose prose-sm mt-8 max-w-none rounded-box border border-base-300 bg-base-100 p-6"
        dangerouslySetInnerHTML={{ __html: session.agreement_html || "<p>Agreement unavailable.</p>" }}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Review &amp; Sign</h2>
        <ClientSignForm
          contractId={session.contract_id || ""}
          defaultName={session.contact_name || ""}
          agencyMessage={session.agency_message || ""}
          mode="invite"
          successHref="/sign/access?done=1"
        />
      </div>
    </main>
  );
}
