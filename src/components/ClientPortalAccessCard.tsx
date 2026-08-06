"use client";

import { useState } from "react";
import { resetClientPortalPassword } from "@/app/actions/ensure-client-portal";

type Props = {
  clientId: string;
  customerId: string;
  contactEmail: string;
  hasPortalLink: boolean;
  canManage: boolean;
};

export function ClientPortalAccessCard({
  clientId,
  customerId,
  contactEmail,
  hasPortalLink,
  canManage,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    customerId: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  if (!canManage) return null;

  async function onReset() {
    const confirmed = window.confirm(
      "Reset this client's portal password? The previous password will stop working immediately.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const result = await resetClientPortalPassword(clientId);
      if (!result.ok) {
        setCredentials(null);
        setError(result.error);
        return;
      }
      setCredentials({
        customerId: result.customerId,
        email: result.email,
        temporaryPassword: result.temporaryPassword,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-box border border-base-300 bg-base-100 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Client portal access</h3>
          <p className="mt-1 text-xs opacity-70">
            Share Customer ID and password offline (phone, chat, or in person). Passwords are
            shown once and are not emailed. After the client uses this password once, their next
            login asks them to choose a permanent password.
          </p>
          <p className="mt-2">
            <span className="opacity-60">Customer ID:</span>{" "}
            <code className="font-mono font-medium">{customerId || "—"}</code>
          </p>
          <p>
            <span className="opacity-60">Contact email:</span> {contactEmail || "—"}
          </p>
          <p className="mt-1 text-xs opacity-70">
            Portal status:{" "}
            {hasPortalLink ? "Linked portal user" : "No linked portal user yet"}
          </p>
        </div>
        {hasPortalLink ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={loading}
            onClick={() => void onReset()}
          >
            {loading ? "Resetting…" : "Reset portal password"}
          </button>
        ) : (
          <p className="max-w-xs text-xs opacity-70">
            Finalize a contract (or Create portal account on the contract page) to create the
            portal login first.
          </p>
        )}
      </div>

      {error ? <p className="mt-3 text-xs text-error">{error}</p> : null}

      {credentials ? (
        <div className="mt-3 rounded-box border border-success/40 bg-success/10 p-3 text-xs">
          <p className="font-semibold">New portal password (shown once)</p>
          <p className="mt-2">
            Customer ID:{" "}
            <code className="font-mono font-semibold">{credentials.customerId}</code>
          </p>
          <p className="mt-1">
            Login email: <strong>{credentials.email}</strong>
          </p>
          <p className="mt-1">
            One-time password:{" "}
            <code className="font-mono font-semibold">{credentials.temporaryPassword}</code>
          </p>
          <p className="mt-2 opacity-80">
            Copy these before leaving this page. Share offline with the client. Previous password
            no longer works.
          </p>
        </div>
      ) : null}
    </div>
  );
}
