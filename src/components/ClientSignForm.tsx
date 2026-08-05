"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyAfterClientSignatureForContract } from "@/app/actions/dashboard-activation";
import {
  declineContractViaInviteAction,
  signContractViaInviteAction,
} from "@/app/actions/signing-invite";
import { declineAsClient, signAsClient } from "@/lib/contract-execution";

type Props = {
  contractId: string;
  defaultName: string;
  defaultTitle?: string;
  agencyMessage?: string;
  mode?: "auth" | "invite";
  successHref?: string;
};

export function ClientSignForm({
  contractId,
  defaultName,
  defaultTitle = "",
  agencyMessage = "",
  mode = "auth",
  successHref,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [title, setTitle] = useState(defaultTitle);
  const [signature, setSignature] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [formMode, setFormMode] = useState<"sign" | "decline">("sign");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationPreview, setActivationPreview] = useState<{
    subject: string;
    text: string;
    activationCode?: string;
  } | null>(null);

  const doneHref =
    successHref || (mode === "invite" ? "/sign/access?done=1" : "/app/contracts/documents");

  async function submitSign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result =
      mode === "invite"
        ? await signContractViaInviteAction({
            signerName: name,
            signerTitle: title,
            signatureData: signature,
            authorizationConfirmed: authorized,
          })
        : await signAsClient({
            contractId,
            signerName: name,
            signerTitle: title,
            signatureData: signature,
            authorizationConfirmed: authorized,
          });
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }

    if (mode === "auth") {
      try {
        await notifyAfterClientSignatureForContract(contractId);
      } catch {
        // Signature remains valid even if welcome email fails.
      }
    }

    setLoading(false);
    const welcome =
      mode === "invite" && "postSignWelcome" in result
        ? (result.postSignWelcome as {
            ok?: boolean;
            simulatedPreview?: {
              subject: string;
              text: string;
              activationCode?: string;
            } | null;
          } | null)
        : null;
    if (
      welcome?.ok &&
      welcome.simulatedPreview
    ) {
      setActivationPreview(welcome.simulatedPreview);
      return;
    }
    router.push(doneHref);
    router.refresh();
  }

  async function submitDecline(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result =
      mode === "invite"
        ? await declineContractViaInviteAction({ reason: declineReason })
        : await declineAsClient({
            contractId,
            reason: declineReason,
          });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(doneHref);
    router.refresh();
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      {activationPreview ? (
        <div className="rounded-box border border-success/40 bg-success/10 p-4">
          <h3 className="font-semibold">Agreement signed successfully</h3>
          <p className="mt-1 text-sm">
            Development email delivery is simulated. This welcome email preview
            is shown once.
          </p>
          <p className="mt-3 text-sm">
            Subject: <strong>{activationPreview.subject}</strong>
          </p>
          {activationPreview.activationCode ? (
            <p className="mt-2 text-sm">
              Dashboard activation code:{" "}
              <code className="font-mono font-semibold">
                {activationPreview.activationCode}
              </code>
            </p>
          ) : null}
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs opacity-80">
            {activationPreview.text}
          </pre>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => {
              router.push(doneHref);
              router.refresh();
            }}
          >
            Continue
          </button>
        </div>
      ) : (
        <>
      {agencyMessage ? (
        <p className="mb-4 rounded-box bg-base-200 p-3 text-sm">
          <span className="font-medium">Message from Rebel Marketing:</span> {agencyMessage}
        </p>
      ) : null}

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`btn btn-sm ${formMode === "sign" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setFormMode("sign")}
        >
          Sign
        </button>
        <button
          type="button"
          className={`btn btn-sm ${formMode === "decline" ? "btn-error" : "btn-ghost"}`}
          onClick={() => setFormMode("decline")}
        >
          Decline
        </button>
      </div>

      {formMode === "sign" ? (
        <form className="space-y-3" onSubmit={submitSign}>
          <label className="form-control w-full">
            <span className="label-text">Full legal name</span>
            <input
              className="input input-bordered"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Title</span>
            <input
              className="input input-bordered"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Typed signature</span>
            <input
              className="input input-bordered font-serif text-lg italic"
              required
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name as signature"
            />
          </label>
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              required
            />
            <span className="label-text">
              I am authorized to bind my organization to this agreement.
            </span>
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={loading || !authorized}>
            {loading ? "Submitting…" : "Sign & Submit"}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={submitDecline}>
          <label className="form-control w-full">
            <span className="label-text">Reason (optional)</span>
            <textarea
              className="textarea textarea-bordered"
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button type="submit" className="btn btn-error" disabled={loading}>
            {loading ? "Declining…" : "Decline agreement"}
          </button>
        </form>
      )}
        </>
      )}
    </div>
  );
}
