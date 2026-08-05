"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { activateDashboardAccount } from "@/app/actions/dashboard-activation";

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") || "");
  const [activationCode, setActivationCode] = useState(searchParams.get("code") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await activateDashboardAccount({
      customerId,
      activationCode,
      password,
      confirmPassword,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(result.message);
    router.push("/app?activated=1");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-primary">Rebel Marketing</p>
        <h1 className="mt-2 text-2xl font-semibold">Activate client dashboard</h1>
        <p className="mt-2 text-sm opacity-70">
          Enter your Customer ID and one-time activation code, then create your permanent password.
          Passwords are stored only in secure authentication — never in your client profile record.
        </p>

        {success ? (
          <p className="mt-4 rounded-box bg-success/15 p-3 text-sm text-success">{success}</p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="form-control w-full">
            <span className="label-text">Customer ID</span>
            <input
              className="input input-bordered"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="CUST-…"
              autoComplete="username"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">One-time activation code</span>
            <input
              className="input input-bordered font-mono tracking-wider"
              required
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              autoComplete="one-time-code"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">New password</span>
            <input
              className="input input-bordered"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Confirm new password</span>
            <input
              className="input input-bordered"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error ? (
            <div className="space-y-2">
              <p className="text-sm text-error">{error}</p>
              {error.toLowerCase().includes("already exists") ? (
                <Link href="/login?portal=client" className="link text-sm">
                  Go to client login
                </Link>
              ) : null}
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Activating…" : "Activate dashboard"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs opacity-60">
          Already activated?{" "}
          <Link href="/login?portal=client" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm opacity-70">Loading…</main>
      }
    >
      <ActivateForm />
    </Suspense>
  );
}
