"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "marketing" },
      },
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
    <main className="rebel-hero min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/login" className="text-xl font-black">
            Rebel Marketing
          </Link>
          <ThemeSelector />
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title">Create account</h1>
            <p className="text-sm opacity-70">
              New signups start as Marketing Team. A manager can update your
              role.
            </p>
            <form className="form-grid space-y-3" onSubmit={onSubmit}>
              <label>
                <span>Full name</span>
                <input
                  className="input input-bordered w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              {error ? (
                <div className="alert alert-error text-sm">{error}</div>
              ) : null}
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Creating…" : "Sign up"}
              </button>
            </form>
            <p className="text-sm opacity-70">
              Already have an account?{" "}
              <Link href="/login" className="link link-primary">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
