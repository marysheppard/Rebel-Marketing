"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeClientPortalPassword } from "@/app/actions/change-portal-password";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await changeClientPortalPassword({
        newPassword: password,
        confirmPassword: confirm,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mx-auto max-w-md space-y-4" onSubmit={onSubmit}>
      <div className="rounded-box border border-warning/40 bg-warning/10 p-3 text-sm">
        You signed in with a one-time password. Choose a new password for next time.
        Enter it twice to confirm.
      </div>

      <label className="form-control w-full">
        <span className="label-text">New password</span>
        <input
          type="password"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="label-text-alt opacity-60">
          At least 8 characters, with a letter and a number.
        </span>
      </label>

      <label className="form-control w-full">
        <span className="label-text">Confirm new password</span>
        <input
          type="password"
          className="input input-bordered w-full"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error ? (
        <p className="rounded-box border border-error/40 bg-error/10 p-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
