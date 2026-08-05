"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { verifySigningInviteAction } from "@/app/actions/signing-invite";

function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const done = searchParams.get("done") === "1";
  const queryError = searchParams.get("error");
  const [customerId, setCustomerId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(queryError);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await verifySigningInviteAction({
      customerId,
      accessCode,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.message || "Unable to verify access.");
      return;
    }
    router.push(`/sign/request/${result.requestId}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-primary">Rebel Marketing</p>
        <h1 className="mt-2 text-2xl font-semibold">Contract signing access</h1>
        <p className="mt-2 text-sm opacity-70">
          Enter your Customer ID and temporary access code from your invitation email. This access
          is limited to the assigned agreement only.
        </p>

        {done ? (
          <p className="mt-4 rounded-box bg-success/15 p-3 text-sm text-success">
            Your response was submitted. You may close this window.
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="form-control w-full">
            <span className="label-text">Customer ID</span>
            <input
              className="input input-bordered"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="CUST-BLUERIDGE"
              autoComplete="username"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Temporary access code</span>
            <input
              className="input input-bordered font-mono tracking-wider"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code from email"
              autoComplete="one-time-code"
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Verifying…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function SignAccessPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm opacity-70">Loading…</main>
      }
    >
      <AccessForm />
    </Suspense>
  );
}
