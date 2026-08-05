"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getClientInviteContext,
  resendSigningInvitation,
  sendSigningInvitation,
} from "@/app/actions/signing-invite";
import {
  getClientActivationStatus,
  resendDashboardActivation,
} from "@/app/actions/dashboard-activation";
import {
  countersignAsAgency,
  finalizeContract,
  listLinkedSigners,
  reviseAfterDecline,
  type LinkedSigner,
} from "@/lib/contract-execution";
import { normalizeContractStatus } from "@/lib/contract-status";
import type { Contract } from "@/lib/types";

type Props = {
  contract: Contract;
  canManage: boolean;
  canCountersign: boolean;
  hasCampaign: boolean;
  profileName?: string;
  openRequest?: {
    id: string;
    status: string;
    recipient_email?: string | null;
    email_delivery_status?: string | null;
    invite_expires_at?: string | null;
  } | null;
  showResendActivation?: boolean;
};

export function ContractExecutionPanel({
  contract,
  canManage,
  canCountersign,
  hasCampaign,
  profileName = "",
  openRequest = null,
  showResendActivation = false,
}: Props) {
  const router = useRouter();
  const status = normalizeContractStatus(contract.contract_status);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [countersignOpen, setCountersignOpen] = useState(false);
  const [signers, setSigners] = useState<LinkedSigner[]>([]);
  const [signersLoading, setSignersLoading] = useState(false);
  const [signerId, setSignerId] = useState("");
  const [agencyMessage, setAgencyMessage] = useState("");
  const [agencyName, setAgencyName] = useState(profileName);
  const [agencyTitle, setAgencyTitle] = useState("Agency Manager");
  const [agencySig, setAgencySig] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [overrideEmail, setOverrideEmail] = useState("");
  const [activationEligible, setActivationEligible] = useState(showResendActivation);
  const [simulatedPreview, setSimulatedPreview] = useState<{
    subject: string;
    text: string;
    temporaryAccessCode?: string;
    activationCode?: string;
    signingLink?: string;
  } | null>(null);

  const canResend =
    canManage &&
    status === "Awaiting Client Signature" &&
    openRequest &&
    ["Sent", "Viewed"].includes(openRequest.status);

  useEffect(() => {
    if (!canManage) return;
    const postSign =
      status === "Awaiting Agency Signature" ||
      status === "Fully Executed" ||
      status === "Active" ||
      showResendActivation;
    if (!postSign) return;
    void getClientActivationStatus(contract.client_id).then((s) => {
      if (s.ok) setActivationEligible(!s.hasActivePortal);
    });
  }, [canManage, contract.client_id, showResendActivation, status]);

  async function openSendModal() {
    setSendOpen(true);
    setSimulatedPreview(null);
    setSignersLoading(true);
    try {
      const [rows, ctx] = await Promise.all([
        listLinkedSigners(contract.client_id),
        getClientInviteContext(contract.client_id),
      ]);
      setSigners(rows);
      const preferred = rows.find((r) => r.preferred) || rows[0];
      setSignerId(preferred?.user_id || "");
      if (ctx.ok) {
        setContactEmail(ctx.client.contactEmail);
        setContactName(ctx.client.contactName);
        setCustomerId(ctx.client.customerId);
        setOverrideEmail("");
      }
    } finally {
      setSignersLoading(false);
    }
  }

  async function run(action: string, fn: () => Promise<void>) {
    setLoading(action);
    setError(null);
    setMessage(null);
    try {
      await fn();
      router.refresh();
      setLoading(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }

  const destinationEmail = contactEmail.trim() || overrideEmail.trim();
  const canSend =
    !!destinationEmail.includes("@") &&
    !!contactName.trim() &&
    (!!signerId || signers.length === 0);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {canManage && (status === "Draft" || status === "Client Declined") ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!!loading}
            onClick={() =>
              run("finalize", async () => {
                if (status === "Client Declined") {
                  const revised = await reviseAfterDecline(contract.id);
                  if (!revised.ok) throw new Error(revised.error);
                }
                const result = await finalizeContract(contract.id);
                if (!result.ok) throw new Error(result.error);
                setMessage("Contract finalized. Ready to send for signature.");
              })
            }
          >
            {loading === "finalize" ? "Finalizing…" : "Finalize for Signature"}
          </button>
        ) : null}

        {canManage && (status === "Finalized" || status === "Awaiting Client Signature") ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!!loading}
            onClick={() => void openSendModal()}
          >
            Send for Signature
          </button>
        ) : null}

        {canResend ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!!loading}
            onClick={() =>
              run("resend", async () => {
                const result = await resendSigningInvitation({ contractId: contract.id });
                if (!result.ok) throw new Error(result.error);
                setSimulatedPreview(
                  result.simulatedPreview
                    ? {
                        subject: result.simulatedPreview.subject,
                        text: result.simulatedPreview.text,
                        temporaryAccessCode: result.simulatedPreview.temporaryAccessCode,
                        signingLink: result.simulatedPreview.signingLink,
                      }
                    : null,
                );
                const statusLabel =
                  result.deliveryStatus === "sent"
                    ? "Email sent"
                    : result.deliveryStatus === "simulated"
                      ? "Email simulated (dev)"
                      : "Email failed";
                setMessage(
                  `${statusLabel} to ${result.recipientEmail}. Prior access code invalidated.`,
                );
                if (result.deliveryError) {
                  throw new Error(result.deliveryError);
                }
              })
            }
          >
            {loading === "resend" ? "Resending…" : "Resend Signing Email"}
          </button>
        ) : null}

        {canManage && activationEligible ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!!loading}
            onClick={() =>
              run("resend-activation", async () => {
                const result = await resendDashboardActivation({
                  clientId: contract.client_id,
                });
                if (!result.ok) throw new Error(result.error);
                setSimulatedPreview(
                  result.simulatedPreview
                    ? {
                        subject: result.simulatedPreview.subject,
                        text: result.simulatedPreview.text,
                        activationCode: result.simulatedPreview.activationCode,
                      }
                    : null,
                );
                const statusLabel =
                  result.deliveryStatus === "sent"
                    ? "Activation emailed"
                    : result.deliveryStatus === "simulated"
                      ? "Activation simulated (dev)"
                      : "Activation email failed";
                setMessage(
                  `${statusLabel} to ${result.recipientEmail}. Prior unused activation codes invalidated.`,
                );
                if (result.deliveryError) throw new Error(result.deliveryError);
              })
            }
          >
            {loading === "resend-activation" ? "Resending…" : "Resend Dashboard Activation"}
          </button>
        ) : null}

        {canCountersign && status === "Awaiting Agency Signature" ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!!loading}
            onClick={() => setCountersignOpen(true)}
          >
            Agency Countersign
          </button>
        ) : null}
      </div>

      {error ? <span className="max-w-sm text-right text-xs text-error">{error}</span> : null}
      {message ? <span className="max-w-sm text-right text-xs text-success">{message}</span> : null}

      {simulatedPreview && !sendOpen ? (
        <div className="mt-2 max-w-lg rounded-box border border-warning/40 bg-warning/10 p-3 text-left text-xs">
          <p className="font-semibold">Simulated email preview (not delivered)</p>
          <p className="mt-1 opacity-80">Subject: {simulatedPreview.subject}</p>
          {simulatedPreview.temporaryAccessCode ? (
            <p className="mt-1">
              Temporary signing code (shown once):{" "}
              <code className="font-mono">{simulatedPreview.temporaryAccessCode}</code>
            </p>
          ) : null}
          {simulatedPreview.activationCode ? (
            <p className="mt-1">
              Activation code (shown once):{" "}
              <code className="font-mono">{simulatedPreview.activationCode}</code>
            </p>
          ) : null}
          {simulatedPreview.signingLink ? (
            <p className="mt-1">
              Link: <code className="break-all">{simulatedPreview.signingLink}</code>
            </p>
          ) : null}
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap opacity-80">
            {simulatedPreview.text}
          </pre>
        </div>
      ) : null}

      {sendOpen ? (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="text-lg font-bold">Send for Signature</h3>
            <p className="mt-2 text-sm opacity-70">
              Emails a secure temporary access code to the client profile contact. Linked portal
              users (primary) also get an in-app notification to sign while logged in.
            </p>

            {signersLoading ? (
              <p className="mt-4 text-sm opacity-70">Loading client details…</p>
            ) : (
              <>
                <div className="mt-4 rounded-box bg-base-200 p-3 text-sm">
                  <p>
                    <span className="opacity-70">Authorized signer:</span>{" "}
                    <strong>{contactName || "—"}</strong>
                  </p>
                  <p className="mt-1">
                    <span className="opacity-70">Customer ID:</span>{" "}
                    <strong>{customerId || "—"}</strong>
                  </p>
                  {contactEmail ? (
                    <p className="mt-1">
                      <span className="opacity-70">Invitation email:</span>{" "}
                      <strong>{contactEmail}</strong>
                    </p>
                  ) : (
                    <label className="form-control mt-2 w-full">
                      <span className="label-text text-warning">
                        Profile email missing — enter destination email
                      </span>
                      <input
                        type="email"
                        className="input input-bordered input-sm"
                        value={overrideEmail}
                        onChange={(e) => setOverrideEmail(e.target.value)}
                        placeholder="client@example.com"
                        required
                      />
                    </label>
                  )}
                </div>

                {signers.length === 0 ? (
                  <p className="mt-3 text-sm opacity-70">
                    No linked portal user — invitation will use the email access path only.
                  </p>
                ) : (
                  <label className="form-control mt-3 w-full">
                    <span className="label-text">In-app signer (primary)</span>
                    <select
                      className="select select-bordered"
                      value={signerId}
                      onChange={(e) => setSignerId(e.target.value)}
                    >
                      {signers.map((s) => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.full_name} ({s.email})
                          {s.preferred ? " · primary contact" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="form-control mt-3 w-full">
                  <span className="label-text">Message (optional)</span>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={3}
                    value={agencyMessage}
                    onChange={(e) => setAgencyMessage(e.target.value)}
                    placeholder="Please review and sign when ready."
                  />
                </label>

                {simulatedPreview ? (
                  <div className="mt-3 rounded-box border border-warning/40 bg-warning/10 p-3 text-xs">
                    <p className="font-semibold">Simulated email (dev) — code shown once</p>
                    <p className="mt-1 font-mono">
                      {simulatedPreview.temporaryAccessCode ||
                        simulatedPreview.activationCode}
                    </p>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap opacity-80">
                      {simulatedPreview.text}
                    </pre>
                  </div>
                ) : null}
              </>
            )}

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setSendOpen(false)}>
                {simulatedPreview ? "Close" : "Cancel"}
              </button>
              {!simulatedPreview ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!!loading || signersLoading || !canSend}
                  onClick={() =>
                    run("send", async () => {
                      const result = await sendSigningInvitation({
                        contractId: contract.id,
                        signerUserId: signerId || undefined,
                        agencyMessage,
                        overrideEmail: contactEmail ? undefined : overrideEmail,
                      });
                      if (!result.ok) throw new Error(result.error);
                      setSimulatedPreview(result.simulatedPreview);
                      const statusLabel =
                        result.deliveryStatus === "sent"
                          ? "Invitation emailed"
                          : result.deliveryStatus === "simulated"
                            ? "Invitation simulated (dev)"
                            : "Invitation email failed";
                      setMessage(`${statusLabel} to ${result.recipientEmail}.`);
                      if (result.deliveryError) {
                        throw new Error(result.deliveryError);
                      }
                      if (result.deliveryStatus !== "simulated") {
                        setSendOpen(false);
                      }
                    })
                  }
                >
                  {loading === "send" ? "Sending…" : `Send to ${destinationEmail || "…"}`}
                </button>
              ) : null}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setSendOpen(false)}>
              close
            </button>
          </form>
        </dialog>
      ) : null}

      {countersignOpen ? (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="text-lg font-bold">Agency countersignature</h3>
            <p className="mt-2 text-sm opacity-70">
              Completing this will fully execute the agreement
              {hasCampaign ? "" : " and activate engagement"}.
            </p>
            <div className="mt-4 space-y-3">
              <label className="form-control w-full">
                <span className="label-text">Full name</span>
                <input
                  className="input input-bordered"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Title</span>
                <input
                  className="input input-bordered"
                  value={agencyTitle}
                  onChange={(e) => setAgencyTitle(e.target.value)}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Typed signature</span>
                <input
                  className="input input-bordered font-serif text-lg italic"
                  value={agencySig}
                  onChange={(e) => setAgencySig(e.target.value)}
                  placeholder="Type your full name"
                />
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                />
                <span className="label-text">
                  I am authorized to bind Rebel Marketing to this agreement.
                </span>
              </label>
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCountersignOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!!loading || !authorized}
                onClick={() =>
                  run("countersign", async () => {
                    const result = await countersignAsAgency({
                      contractId: contract.id,
                      signerName: agencyName,
                      signerTitle: agencyTitle,
                      signatureData: agencySig,
                      authorizationConfirmed: authorized,
                    });
                    if (!result.ok) throw new Error(result.error);
                    setCountersignOpen(false);
                    setMessage("Fully executed. Engagement activated.");
                  })
                }
              >
                {loading === "countersign" ? "Signing…" : "Countersign & Execute"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setCountersignOpen(false)}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}
