"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  Megaphone,
  LineChart,
  Clock,
  ListTodo,
  CalendarDays,
  DollarSign,
  CheckSquare,
  Receipt,
  Wallet,
  BarChart3,
  LogOut,
  Menu,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationsBell } from "@/components/NotificationsBell";
import { RebelLogo } from "@/components/RebelLogo";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Profile, type UserRole } from "@/lib/types";

/** Marketing employee UX from this branch; manager/billing dashboards come later. */
const NAV: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}[] = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["agency_manager", "account_manager", "marketing", "billing", "client"],
  },
  {
    href: "/app/ar",
    label: "Accounts Receivable",
    icon: Wallet,
    roles: ["agency_manager", "billing", "account_manager"],
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: LineChart,
    roles: ["marketing"],
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: CheckSquare,
    roles: ["marketing"],
  },
  {
    href: "/app/billing",
    label: "Billing",
    icon: Receipt,
    roles: ["agency_manager", "billing", "account_manager"],
  },
  {
    href: "/app/calendar",
    label: "Calendar",
    icon: CalendarDays,
    roles: ["marketing"],
  },
  {
    href: "/app/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    roles: ["marketing"],
  },
  {
    href: "/app/clients",
    label: "Clients",
    icon: Users,
    roles: ["agency_manager", "account_manager", "billing"],
  },
  {
    href: "/app/contracts",
    label: "Contracts",
    icon: FileText,
    roles: ["agency_manager", "account_manager", "billing"],
  },
  {
    href: "/app/contracts/documents",
    label: "Contracts & Documents",
    icon: FolderOpen,
    roles: ["client"],
  },
  {
    href: "/app/costs",
    label: "Costs",
    icon: DollarSign,
    roles: ["marketing"],
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["agency_manager", "account_manager", "billing"],
  },
  {
    href: "/app/tasks",
    label: "Tasks",
    icon: ListTodo,
    roles: ["marketing"],
  },
  {
    href: "/app/work",
    label: "Time & PTO",
    icon: Clock,
    roles: ["marketing"],
  },
];

function AccessDeniedBanner({ isClient }: { isClient: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const denied = isClient && searchParams.get("denied") === "1";

  useEffect(() => {
    if (!denied) return;
    const t = window.setTimeout(() => {
      router.replace("/app");
    }, 4000);
    return () => window.clearTimeout(t);
  }, [denied, router]);

  if (!denied) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Access denied. The Client Portal only includes your Customer Dashboard.
    </div>
  );
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((n) => n.roles.includes(profile.role));

  async function logout() {
    try {
      sessionStorage.removeItem("rebel-welcome-msg");
    } catch {
      /* ignore */
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-base-300 bg-base-100/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <label htmlFor="app-drawer" className="btn btn-ghost btn-square lg:hidden">
              <Menu className="h-5 w-5" />
            </label>
            <div>
              <div className="text-sm font-black tracking-tight sm:text-base">
                {profile.role === "client"
                  ? "Customer Dashboard"
                  : "Employee Dashboard"}
              </div>
              <div className="text-xs opacity-60">Rebel Marketing</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{profile.full_name}</div>
              <div className="badge badge-primary badge-sm">
                {ROLE_LABELS[profile.role]}
              </div>
            </div>
            <span className="badge badge-primary badge-sm sm:hidden">
              {ROLE_LABELS[profile.role]}
            </span>
            {profile.role === "marketing" ? <NotificationBell /> : null}
            {profile.role === "client" ||
            profile.role === "agency_manager" ||
            profile.role === "account_manager" ? (
              <NotificationsBell />
            ) : null}
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Suspense fallback={null}>
            <AccessDeniedBanner isClient={profile.role === "client"} />
          </Suspense>
          {children}
        </main>
      </div>
      <div className="drawer-side z-30">
        <label htmlFor="app-drawer" className="drawer-overlay" />
        <aside className="flex min-h-full w-72 flex-col bg-base-200 p-4">
          <div className="mb-6 px-2">
            <RebelLogo className="h-10 w-auto" />
            <p className="mt-2 text-xs opacity-60">Connected contract-to-cash</p>
          </div>
          <ul className="menu gap-1">
            {items.map((item) => {
              const active =
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link href={item.href} className={active ? "active" : ""}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto rounded-box bg-base-100 p-3 text-xs opacity-70">
            Viewing as <strong>{ROLE_LABELS[profile.role]}</strong>.
            {profile.role === "client"
              ? " Client portal — dashboard access only."
              : " Admin workspace for agency staff."}
          </div>
        </aside>
      </div>
    </div>
  );
}
