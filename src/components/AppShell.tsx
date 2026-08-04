"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Briefcase,
  DollarSign,
  CheckSquare,
  Receipt,
  Wallet,
  BarChart3,
  LogOut,
  Menu,
} from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Profile, type UserRole } from "@/lib/types";

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
    href: "/app/clients",
    label: "Clients",
    icon: Users,
    roles: ["agency_manager", "account_manager", "billing"],
  },
  {
    href: "/app/contracts",
    label: "Contracts",
    icon: FileText,
    roles: ["agency_manager", "account_manager", "billing", "client"],
  },
  {
    href: "/app/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    roles: ["agency_manager", "account_manager", "marketing", "billing", "client"],
  },
  {
    href: "/app/work",
    label: "Work",
    icon: Briefcase,
    roles: ["agency_manager", "account_manager", "marketing", "billing", "client"],
  },
  {
    href: "/app/costs",
    label: "Costs",
    icon: DollarSign,
    roles: ["agency_manager", "account_manager", "marketing", "billing"],
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: CheckSquare,
    roles: ["agency_manager", "account_manager", "marketing", "client"],
  },
  {
    href: "/app/billing",
    label: "Billing",
    icon: Receipt,
    roles: ["agency_manager", "billing", "account_manager"],
  },
  {
    href: "/app/ar",
    label: "Accounts Receivable",
    icon: Wallet,
    roles: ["agency_manager", "billing", "account_manager", "client"],
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["agency_manager", "account_manager", "billing"],
  },
];

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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
                Marketing Agency Contract-to-Cash
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
            <ThemeSelector />
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
      <div className="drawer-side z-30">
        <label htmlFor="app-drawer" className="drawer-overlay" />
        <aside className="flex min-h-full w-72 flex-col bg-base-200 p-4">
          <div className="mb-6 px-2">
            <div className="text-2xl font-black">
              Rebel <span className="text-primary">Marketing</span>
            </div>
            <p className="mt-1 text-xs opacity-60">Connected contract-to-cash</p>
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
            Viewing as <strong>{ROLE_LABELS[profile.role]}</strong>. Use demo
            accounts on the login page to switch perspectives quickly.
          </div>
        </aside>
      </div>
    </div>
  );
}
