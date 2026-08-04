"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { createClient } from "@/lib/supabase/client";
import { DEMO_ACCOUNTS } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e?: React.FormEvent, demo?: { email: string; password: string }) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: demo?.email ?? email,
      password: demo?.password ?? password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="rebel-hero relative min-h-screen overflow-hidden">
      <div className="rebel-grid absolute inset-0 opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="text-2xl font-black tracking-tight">
            Rebel <span className="text-primary">Marketing</span>
          </div>
          <ThemeSelector />
        </header>

        <div className="mt-10 grid flex-1 items-center gap-10 lg:grid-cols-2">
          <section className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Contract-to-Cash
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">
              Turn Every Campaign Into a Clearer Business Decision.
            </h1>
            <p className="max-w-xl text-lg opacity-80">
              Manage clients, campaigns, costs, billing, approvals, and
              profitability in one connected system.
            </p>
            <ul className="space-y-2 text-sm opacity-75">
              <li>• Retainers, project fees, and pass-through advertising spend</li>
              <li>• Client approvals, work tracking, and collection risk</li>
              <li>• Campaign and client profitability managers can act on</li>
            </ul>
          </section>

          <section className="card border border-base-content/10 bg-base-100/90 shadow-2xl backdrop-blur">
            <div className="card-body">
              <h2 className="card-title">Sign in</h2>
              <form className="form-grid mt-2 space-y-3" onSubmit={(e) => signIn(e)}>
                <label>
                  <span>Email</span>
                  <input
                    className="input input-bordered w-full"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    className="input input-bordered w-full"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                {error ? (
                  <div className="alert alert-error text-sm">{error}</div>
                ) : null}
                <button className="btn btn-primary w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Log in"}
                </button>
              </form>

              <div className="divider text-xs">Demo accounts (one click)</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    className="btn btn-outline btn-sm justify-start"
                    disabled={loading}
                    onClick={() => signIn(undefined, d)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-sm opacity-70">
                Need an account?{" "}
                <Link href="/signup" className="link link-primary">
                  Sign up
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
