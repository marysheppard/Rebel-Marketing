"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Briefcase, Building2 } from "lucide-react";
import { RebelLogo } from "@/components/RebelLogo";
import { createClient } from "@/lib/supabase/client";
import {
  CUSTOMER_LOGIN_IDS,
  EMPLOYEE_LOGIN_IDS,
  resolveCustomerLogin,
  resolveEmployeeLogin,
} from "@/lib/types";

type Portal = "employee" | "customer";
type Step = "choose" | "credentials";

const GENERIC_CUSTOMER_ERROR = "The CustomerID or access code is incorrect.";

function portalFromQuery(raw: string | null): Portal | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "admin" || v === "employee") return "employee";
  if (v === "client" || v === "customer") return "customer";
  return null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPortal = portalFromQuery(searchParams.get("portal"));

  const [step, setStep] = useState<Step>(
    initialPortal ? "credentials" : "choose",
  );
  const [portal, setPortal] = useState<Portal | null>(initialPortal);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = portalFromQuery(searchParams.get("portal"));
    if (next) {
      setPortal(next);
      setStep("credentials");
      setError(null);
    }
  }, [searchParams]);

  function choosePortal(next: Portal) {
    setPortal(next);
    setError(null);
    setStep("credentials");
  }

  function goBack() {
    setStep("choose");
    setPortal(null);
    setError(null);
    setPassword("");
    setAccessCode("");
    router.replace("/login");
  }

  async function authenticate(
    email: string,
    pass: string,
    expectedPortal: Portal,
  ) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (err) {
      setLoading(false);
      setError(
        expectedPortal === "customer" ? GENERIC_CUSTOMER_ERROR : err.message,
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, password_change_deferred")
      .eq("id", user!.id)
      .single();

    const role = profile?.role as string | undefined;
    const isClient = role === "client";
    if (expectedPortal === "employee" && isClient) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "This account is a client login. Use Client Portal Login instead.",
      );
      return;
    }
    if (expectedPortal === "customer" && !isClient) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is an admin login. Use Admin Login instead.");
      return;
    }

    setLoading(false);
    if (
      isClient &&
      profile?.must_change_password &&
      !profile?.password_change_deferred
    ) {
      router.push("/app/account/change-password");
    } else {
      router.push("/app");
    }
    router.refresh();
  }

  async function signInEmployee(e: React.FormEvent) {
    e.preventDefault();
    const resolved = resolveEmployeeLogin(employeeId, password);
    if (!resolved) {
      setError("Enter a valid employee ID (e.g. EMP-1001) or work email.");
      return;
    }
    await authenticate(resolved.email, resolved.password, "employee");
  }

  async function signInCustomer(e: React.FormEvent) {
    e.preventDefault();
    const demoResolved = resolveCustomerLogin(customerId, accessCode);
    if (demoResolved) {
      await authenticate(demoResolved.email, demoResolved.password, "customer");
      return;
    }
    const { resolveClientLoginEmailAction } = await import(
      "@/app/actions/client-login"
    );
    const resolved = await resolveClientLoginEmailAction(customerId);
    if (!resolved.ok) {
      setError(GENERIC_CUSTOMER_ERROR);
      return;
    }
    await authenticate(resolved.email, accessCode, "customer");
  }

  async function fillEmployeeDemo(id: string) {
    const demo = EMPLOYEE_LOGIN_IDS[id];
    if (!demo) return;
    setEmployeeId(id);
    setPassword(demo.password);
    await authenticate(demo.email, demo.password, "employee");
  }

  async function fillCustomerDemo(id: string) {
    const demo = CUSTOMER_LOGIN_IDS[id];
    if (!demo) return;
    setCustomerId(id);
    setAccessCode(demo.accessCode);
    await authenticate(demo.email, demo.accessCode, "customer");
  }

  return (
    <main className="rebel-hero relative min-h-screen overflow-hidden">
      <div className="rebel-grid absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <header className="login-fade-in flex items-center justify-between">
          <Link href="/" aria-label="Back to homepage">
            <RebelLogo priority className="h-14 w-auto sm:h-20" />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1e3a5f] hover:text-[#0b1f3a]"
          >
            Back to site
          </Link>
        </header>

        <div className="mt-10 grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="login-slide-up rebel-hero-panel relative overflow-hidden rounded-2xl px-8 py-10 text-white shadow-xl sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Secure access
              </p>
              <h1 className="max-w-lg text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.65rem]">
                Sign in to the right workspace.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-white/80">
                Admin tools stay with the agency. Clients open a dedicated
                portal for their customer dashboard—nothing more.
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-white/75">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  Admin Login for agency staff
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  Client Portal for customer partners
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  Role enforcement keeps dashboards separate
                </li>
              </ul>
            </div>
          </section>

          <section className="login-slide-up rounded-2xl border border-[#0b1f3a14] bg-white p-7 shadow-[0_20px_60px_#0b1f3a12] sm:p-8">
            {step === "choose" ? (
              <div className="login-fade-in space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1f3a]">
                    How are you signing in?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/a0">
                    Choose your portal to continue. Admin and client accounts
                    use different credentials.
                  </p>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    className="login-choice flex w-full items-start gap-4 rounded-xl border border-[#0b1f3a18] bg-[#f7f9fc] px-5 py-5 text-left hover:border-[#0b1f3a]"
                    onClick={() => choosePortal("employee")}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0b1f3a] text-white">
                      <Briefcase className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-bold text-[#0b1f3a]">
                        Admin Login
                      </span>
                      <span className="mt-1 block text-sm text-[#1e3a5f]/b8">
                        Agency staff — employee ID and password
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="login-choice flex w-full items-start gap-4 rounded-xl border border-[#0b1f3a18] bg-[#f7f9fc] px-5 py-5 text-left hover:border-[#0b1f3a]"
                    onClick={() => choosePortal("customer")}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0b1f3a] text-white">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-bold text-[#0b1f3a]">
                        Client Portal Login
                      </span>
                      <span className="mt-1 block text-sm text-[#1e3a5f]/b8">
                        Client partners — customer ID and password
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            ) : portal === "employee" ? (
              <div className="login-fade-in space-y-5">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a5f] hover:text-[#0b1f3a]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1f3a]">
                    Admin Login
                  </h2>
                  <p className="mt-1.5 text-sm text-[#1e3a5f]/a0">
                    Enter your employee ID and password to open the admin
                    workspace.
                  </p>
                </div>
                <form className="form-grid space-y-3.5" onSubmit={signInEmployee}>
                  <label>
                    <span>Employee ID</span>
                    <input
                      className="input input-bordered w-full border-[#0b1f3a22] bg-white focus:border-[#0b1f3a]"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="EMP-1001"
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      className="input input-bordered w-full border-[#0b1f3a22] bg-white focus:border-[#0b1f3a]"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}
                  <button
                    className="btn w-full border-none bg-[#0b1f3a] text-white hover:bg-[#163054]"
                    disabled={loading}
                  >
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1e3a5f]/70">
                    Demo employee IDs
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(EMPLOYEE_LOGIN_IDS).map(([id, demo]) => (
                      <button
                        key={id}
                        type="button"
                        className="rounded-lg border border-[#0b1f3a18] px-3 py-2 text-left text-xs font-medium text-[#0b1f3a] hover:border-[#0b1f3a] hover:bg-[#f7f9fc]"
                        disabled={loading}
                        onClick={() => fillEmployeeDemo(id)}
                      >
                        <span className="block font-bold">{id}</span>
                        <span className="opacity-70">{demo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-center text-sm text-[#1e3a5f]/80">
                  Need an account?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-[#0b1f3a] underline-offset-2 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            ) : (
              <div className="login-fade-in space-y-5">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a5f] hover:text-[#0b1f3a]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1f3a]">
                    Client Portal Login
                  </h2>
                  <p className="mt-1.5 text-sm text-[#1e3a5f]/a0">
                    Enter your customer ID and password to open your dashboard,
                    including contracts awaiting signature.
                  </p>
                </div>
                <form className="form-grid space-y-3.5" onSubmit={signInCustomer}>
                  <label>
                    <span>Customer ID</span>
                    <input
                      className="input input-bordered w-full border-[#0b1f3a22] bg-white focus:border-[#0b1f3a]"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="CUST-1048"
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      className="input input-bordered w-full border-[#0b1f3a22] bg-white focus:border-[#0b1f3a]"
                      type="password"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}
                  <button
                    className="btn w-full border-none bg-[#0b1f3a] text-white hover:bg-[#163054]"
                    disabled={loading}
                  >
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1e3a5f]/70">
                    Demo customer IDs
                  </p>
                  <div className="grid gap-2">
                    {Object.entries(CUSTOMER_LOGIN_IDS).map(([id, demo]) => (
                      <button
                        key={id}
                        type="button"
                        className="rounded-lg border border-[#0b1f3a18] px-3 py-2 text-left text-xs font-medium text-[#0b1f3a] hover:border-[#0b1f3a] hover:bg-[#f7f9fc]"
                        disabled={loading}
                        onClick={() => fillCustomerDemo(id)}
                      >
                        <span className="block font-bold">{id}</span>
                        <span className="opacity-70">{demo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="rebel-hero flex min-h-screen items-center justify-center">
          <p className="text-sm text-[#1e3a5f]">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
