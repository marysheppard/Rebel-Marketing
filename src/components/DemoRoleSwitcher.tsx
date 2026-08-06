"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_ACCOUNTS, ROLE_LABELS, type Profile } from "@/lib/types";

function isDemoEmail(email: string | null | undefined) {
  if (!email) return false;
  const e = email.toLowerCase();
  return (
    e.endsWith("@rebel.demo") ||
    e.endsWith("@rebelmarketing.demo") ||
    DEMO_ACCOUNTS.some((a) => a.email.toLowerCase() === e)
  );
}

export function DemoRoleSwitcher({
  profile,
}: {
  profile: Pick<Profile, "email" | "role" | "full_name">;
}) {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setSessionEmail(data.user?.email ?? null);
    });
  }, []);

  const label = ROLE_LABELS[profile.role];
  const demo = isDemoEmail(sessionEmail) || isDemoEmail(profile.email);

  if (!demo) {
    return <span className="badge badge-primary badge-sm">{label}</span>;
  }

  async function switchTo(email: string, password: string) {
    const current = (sessionEmail ?? profile.email).toLowerCase();
    if (switching || email.toLowerCase() === current) {
      return;
    }
    setSwitching(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setSwitching(false);
      setError(err.message);
      return;
    }
    window.location.assign("/app");
  }

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className={`badge badge-primary badge-sm inline-flex cursor-pointer items-center gap-1 ${
          switching ? "pointer-events-none opacity-60" : ""
        }`}
        aria-label="Switch demo account"
        aria-disabled={switching}
      >
        {switching ? "Switching…" : label}
        <ChevronDown className="h-3 w-3 opacity-80" aria-hidden />
      </div>
      <ul
        tabIndex={0}
        className="menu dropdown-content z-40 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
      >
        <li className="menu-title px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Demo accounts
          </span>
        </li>
        {DEMO_ACCOUNTS.map((account) => {
          const active = sessionEmail
            ? account.email.toLowerCase() === sessionEmail.toLowerCase()
            : account.role === profile.role;
          return (
            <li key={account.email}>
              <button
                type="button"
                className={active ? "active font-semibold" : undefined}
                disabled={switching || active}
                onClick={() => void switchTo(account.email, account.password)}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>{account.label}</span>
                  <span className="text-[10px] font-normal opacity-50">
                    {account.email}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {error ? (
          <li className="pointer-events-none px-2 py-1">
            <span className="text-xs text-error">{error}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
