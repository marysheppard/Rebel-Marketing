"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ensureClientPortalAccount, resetClientPortalPassword } from "@/app/actions/ensure-client-portal";
import {
  countersignAsAgency,
  finalizeContract,
  listLinkedSigners,
  reviseAfterDecline,
  sendForSignature,
  type LinkedSigner,
} from "@/lib/contract-execution";
import { normalizeContractStatus } from "@/lib/contract-status";
import type { Contract } from "@/lib/types";

type PortalCredentials = {
  customerId: string;
  email: string;
  temporaryPassword?: string;
  alreadyActive: boolean;
  linkedExistingAuthUser?: boolean;
};

type Props = {
  contract: Contract;
  canManage: boolean;
  canCountersign: boolean;
  hasCampaign: boolean;
  profileName?: string;
  openRequest?: {
    id: string;
    status: string;
    signer_user_id?: string | null;
    due_at?: string | null;
    sent_at?: string | null;
  } | null;
};

export function ContractExecutionPanel({
  contract,
  canManage,
  canCountersign,
  hasCampaign,
  profileName = "",
  openRequest = null,
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
  const [portalCredentials, setPortalCredentials] = useState<PortalCredentials | null>(
    null,
  );
  const [portalProvisionError, setPortalProvisionError] = useState<string | null>(null);

  async function provisionPortalAccount() {
    const provision = await ensureClientPortalAccount(contract.client_id);
    if (!provision.ok) {
      setPortalCredentials(null);
      setPortalProvisionError(provision.error);
      return provision;
    }
    setPortalProvisionError(null);
    if (provision.alreadyActive) {
      setPortalCredentials({
        customerId: provision.customerId,
        email: provision.email,
        alreadyActive: true,
      });
      setMessage(
        "Contract ready. Client portal account is already active — send when ready.",
      );
    } else if (provision.createdNewUser && provision.temporaryPassword) {
      setPortalCredentials({
        customerId: provision.customerId,
        email: provision.email,
        temporaryPassword: provision.temporaryPassword,
        alreadyActive: false,
      });
      setMessage(
        "Contract finalized. Share the one-time portal password with the client, then Send to Client Portal.",
      );
    } else {
      setPortalCredentials({
        customerId: provision.customerId,
        email: provision.email,
        alreadyActive: false,
        linkedExistingAuthUser: true,
      });
      setMessage(
        "Contract finalized. Existing Auth user linked to this client — Send to Client Portal when ready.",
      );
    }
    return provision;
  }

  async function openSendModal() {
    setSendOpen(true);
    setError(null);
    setMessage(null);
    setSignersLoading(true);
    try {
      const rows = await listLinkedSigners(contract.client_id);
      setSigners(rows);
      const preferred = rows.find((r) => r.preferred) || rows[0];
      setSignerId(preferred?.user_id || "");
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

  const canSend = !!signerId && signers.length > 0;
  const showPortalRetry =
    canManage &&
    (status === "Finalized" || status === "Awaiting Client Signature") &&
    (!portalCredentials || !!portalProvisionError);
  const showResetPassword =
    canManage &&
    (status === "Finalized" ||
      status === "Awaiting Client Signature" ||
      status === "Awaiting Agency Signature" ||
      status === "Fully Executed" ||
      status === "Active" ||
      !!portalCredentials);

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
                setMessage("Contract finalized. Setting up client portal account…");
                const provision = await provisionPortalAccount();
                if (!provision.ok) {
                  setError(`Portal account not created: ${provision.error}`);
                }
              })
            }
          >
            {loading === "finalize" ? "Finalizing…" : "Finalize for Signature"}
          </button>
        ) : null}

        {showPortalRetry ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!!loading}
            onClick={() =>
              run("provision", async () => {
                const provision = await provisionPortalAccount();
                if (!provision.ok) {
                  throw new Error(provision.error);
                }
              })
            }
          >
            {loading === "provision" ? "Creating…" : "Create portal account"}
          </button>
        ) : null}

        {showResetPassword ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!!loading}
            onClick={() =>
              run("reset-password", async () => {
                const confirmed = window.confirm(
                  "Reset this client's portal password? The previous password will stop working immediately.",
                );
                if (!confirmed) return;
                const result = await resetClientPortalPassword(contract.client_id);
                if (!result.ok) throw new Error(result.error);
                setPortalProvisionError(null);
                setPortalCredentials({
                  customerId: result.customerId,
                  email: result.email,
                  temporaryPassword: result.temporaryPassword,
                  alreadyActive: true,
                });
                setMessage(
                  "New portal password generated. Share it offline with the client (shown once).",
                );
              })
            }
          >
            {loading === "reset-password" ? "Resetting…" : "Reset portal password"}
          </button>
        ) : null}

        {canManage && (status === "Finalized" || status === "Awaiting Client Signature") ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!!loading}
            onClick={() => void openSendModal()}
          >
            Send to Client Portal
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

      {portalCredentials ? (
        <div className="mt-2 max-w-lg rounded-box border border-success/40 bg-success/10 p-3 text-left text-xs">
          <p className="font-semibold">
            {portalCredentials.temporaryPassword
              ? portalCredentials.alreadyActive && !portalCredentials.linkedExistingAuthUser
                ? "Portal password ready to share"
                : "Client portal credentials"
              : portalCredentials.alreadyActive
                ? "Client portal already active"
                : "Client portal user linked"}
          </p>
          <p className="mt-2">
            Customer ID:{" "}
            <code className="font-mono font-semibold">{portalCredentials.customerId}</code>
          </p>
          <p className="mt-1">
            Login email: <strong>{portalCredentials.email}</strong>
          </p>
          {portalCredentials.temporaryPassword ? (
            <>
              <p className="mt-1">
                One-time password:{" "}
                <code className="font-mono font-semibold">
                  {portalCredentials.temporaryPassword}
                </code>
              </p>
              <p className="mt-2 opacity-80">
                Share Customer ID and password offline (phone, chat, or in person). Do not email
                if you cannot. Shown once on this page — copy them before you leave. If needed
                again, use <strong>Reset portal password</strong>. After the client signs in once
                with this password, their next login will ask them to choose a permanent password.
              </p>
              <p className="mt-1 opacity-80">
                Client login: Client Portal → Customer ID + password → Contracts &amp; Documents.
              </p>
            </>
          ) : (
            <p className="mt-2 opacity-80">
              No new password was generated. Use <strong>Reset portal password</strong> to issue
              a fresh password to share offline.
            </p>
          )}
        </div>
      ) : null}

      {portalProvisionError && !portalCredentials ? (
        <div className="mt-2 max-w-lg rounded-box border border-warning/40 bg-warning/10 p-3 text-left text-xs">
          <p className="font-semibold">Portal account not created</p>
          <p className="mt-1">{portalProvisionError}</p>
          <p className="mt-2 opacity-80">
            The contract is finalized. Fix the issue, then click Create portal account.
          </p>
        </div>
      ) : null}

      {openRequest && status === "Awaiting Client Signature" ? (
        <p className="max-w-sm text-right text-xs opacity-70">
          Sent to client portal
          {openRequest.sent_at
            ? ` on ${new Date(openRequest.sent_at).toLocaleString()}`
            : ""}
          {openRequest.due_at
            ? ` · due ${new Date(openRequest.due_at).toLocaleDateString()}`
            : ""}
          .
        </p>
      ) : null}

      {sendOpen ? (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="text-lg font-bold">Send to Client Portal</h3>
            <p className="mt-2 text-sm opacity-70">
              Assign this agreement to an authorized client user. They will review and sign after
              signing in with their normal client portal login.
            </p>

            {signersLoading ? (
              <p className="mt-4 text-sm opacity-70">Loading linked client users…</p>
            ) : signers.length === 0 ? (
              <div className="mt-4 rounded-box border border-warning/40 bg-warning/10 p-3 text-sm">
                This client does not have an active portal account. Create or activate a client
                user before sending the agreement.
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-box bg-base-200 p-3 text-sm">
                  <p>
                    <span className="opacity-70">Contract:</span>{" "}
                    <strong>{contract.contract_name}</strong>
                  </p>
                  <p className="mt-1">
                    <span className="opacity-70">Delivery:</span>{" "}
                    <strong>Client portal (in-app)</strong>
                  </p>
                </div>

                <label className="form-control mt-3 w-full">
                  <span className="label-text">Authorized client signer</span>
                  <select
                    className="select select-bordered"
                    value={signerId}
                    onChange={(e) => setSignerId(e.target.value)}
                    required
                  >
                    {signers.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name} ({s.email})
                        {s.preferred ? " · primary contact" : ""}
                      </option>
                    ))}
                  </select>
                </label>

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
              </>
            )}

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setSendOpen(false)}>
                Cancel
              </button>
              {signers.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!!loading || signersLoading || !canSend}
                  onClick={() =>
                    run("send", async () => {
                      const result = await sendForSignature({
                        contractId: contract.id,
                        signerUserId: signerId,
                        agencyMessage,
                      });
                      if (!result.ok) throw new Error(result.error);
                      setSendOpen(false);
                      setMessage(
                        "Agreement sent to the client portal. The assigned user will see it under Contracts & Documents.",
                      );
                    })
                  }
                >
                  {loading === "send" ? "Sending…" : "Send to Client Portal"}
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
