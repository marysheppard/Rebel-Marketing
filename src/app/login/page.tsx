"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [portal, setPortal] = useState<Portal | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep the login screen on the light corporate look even if a dark theme
  // was saved from the in-app theme selector.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "corporate");
  }, []);

  function choosePortal(next: Portal) {
    setPortal(next);
    setError(null);
    setStep("credentials");
  }

  function goBack() {
    setStep("choose");
    setError(null);
    setPassword("");
    setAccessCode("");
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
      setError(err.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();

    const role = profile?.role as string | undefined;
    const isClient = role === "client";
    if (expectedPortal === "employee" && isClient) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is a customer login. Use the Customer portal.");
      return;
    }
    if (expectedPortal === "customer" && !isClient) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is an employee login. Use the Employee portal.");
      return;
    }

    setLoading(false);
    router.push("/app");
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
    const resolved = resolveCustomerLogin(customerId, accessCode);
    if (!resolved) {
      setError("Enter a valid customer ID (e.g. CUST-BLUERIDGE) or client email.");
      return;
    }
    await authenticate(resolved.email, resolved.password, "customer");
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
    <main
      className="rebel-hero relative min-h-screen overflow-hidden text-[#0b1f3a]"
      data-theme="corporate"
    >
      <div className="rebel-grid absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <header className="login-fade-in flex items-center justify-between">
          <RebelLogo priority className="h-14 w-auto sm:h-20" />
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-[#1e3a5f] sm:block">
            Secure portal
          </p>
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
                Growth you can manage
              </p>
              <h1 className="max-w-lg text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.65rem]">
                A clearer way to run clients, campaigns, and cash flow.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-white/80">
                Built for marketing teams and client partners who need
                outcomes—not vanity metrics—in one connected workspace.
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-white/75">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  Unified client, contract, and campaign operations
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  Approvals, billing, and profitability in one place
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  Separate employee and customer access for cleaner security
                </li>
              </ul>
            </div>
          </section>

          <section className="login-slide-up rounded-2xl border border-[#0b1f3a]/15 bg-white p-7 text-[#0b1f3a] shadow-[0_20px_60px_rgba(11,31,58,0.08)] sm:p-8">
            {step === "choose" ? (
              <div className="login-fade-in space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1f3a]">
                    How are you signing in?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/80">
                    Choose your portal to continue. Employees and customers use
                    different credentials.
                  </p>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    className="login-choice flex w-full items-start gap-4 rounded-xl border border-[#0b1f3a]/20 bg-[#f7f9fc] px-5 py-5 text-left text-[#0b1f3a] hover:border-[#0b1f3a]"
                    onClick={() => choosePortal("employee")}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0b1f3a] text-white">
                      <Briefcase className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-bold text-[#0b1f3a]">
                        Employee
                      </span>
                      <span className="mt-1 block text-sm text-[#1e3a5f]/80">
                        Agency staff — use your employee ID and password
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="login-choice flex w-full items-start gap-4 rounded-xl border border-[#0b1f3a]/20 bg-[#f7f9fc] px-5 py-5 text-left text-[#0b1f3a] hover:border-[#0b1f3a]"
                    onClick={() => choosePortal("customer")}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0b1f3a] text-white">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-bold text-[#0b1f3a]">
                        Customer
                      </span>
                      <span className="mt-1 block text-sm text-[#1e3a5f]/80">
                        Client partners — use your customer ID and access code
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
                    Employee sign in
                  </h2>
                  <p className="mt-1.5 text-sm text-[#1e3a5f]/80">
                    Enter your employee ID and password to open the workspace.
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
                        className="rounded-lg border border-[#0b1f3a]/20 px-3 py-2 text-left text-xs font-medium text-[#0b1f3a] hover:border-[#0b1f3a] hover:bg-[#f7f9fc]"
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
                  <Link href="/signup" className="font-semibold text-[#0b1f3a] underline-offset-2 hover:underline">
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
                    Customer sign in
                  </h2>
                  <p className="mt-1.5 text-sm text-[#1e3a5f]/80">
                    Enter your personalized customer ID and access code.
                  </p>
                </div>
                <form className="form-grid space-y-3.5" onSubmit={signInCustomer}>
                  <label>
                    <span>Customer ID</span>
                    <input
                      className="input input-bordered w-full border-[#0b1f3a22] bg-white focus:border-[#0b1f3a]"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="CUST-BLUERIDGE"
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label>
                    <span>Access code</span>
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
                        className="rounded-lg border border-[#0b1f3a]/20 px-3 py-2 text-left text-xs font-medium text-[#0b1f3a] hover:border-[#0b1f3a] hover:bg-[#f7f9fc]"
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
