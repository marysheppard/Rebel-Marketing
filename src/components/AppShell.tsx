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
  ClipboardList,
  Clock,
  LogOut,
  Menu,
  LineChart,
  Shield,
  UserCog,
  Calculator,
  Bell,
  Activity,
} from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { RebelLogo } from "@/components/RebelLogo";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Profile, type UserRole } from "@/lib/types";

const AGENCY_NAV_GROUPS: { label: string; hrefs: string[] }[] = [
  {
    label: "Portfolio",
    hrefs: [
      "/app/analytics",
      "/app/campaigns",
      "/app/clients",
      "/app/contracts",
      "/app/profitability",
    ],
  },
  {
    label: "Finance",
    hrefs: ["/app/accounting", "/app/ar", "/app/billing"],
  },
  {
    label: "People",
    hrefs: ["/app/employees"],
  },
  {
    label: "Risk",
    hrefs: ["/app/controls"],
  },
];

const AM_NAV_GROUPS: { label: string; hrefs: string[] }[] = [
  {
    label: "Portfolio",
    hrefs: [
      "/app/analytics",
      "/app/campaigns",
      "/app/profitability",
      "/app/contracts",
      "/app/metrics",
      "/app/clients",
    ],
  },
  {
    label: "Delivery",
    hrefs: ["/app/approvals", "/app/costs", "/app/tasks", "/app/time"],
  },
];

function notificationHref(role: UserRole) {
  if (role === "agency_manager" || role === "account_manager") {
    return "/app/alerts";
  }
  if (role === "client") return "/app/ar";
  return "/app/tasks";
}

const NAV: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}[] = [
  // Account Manager
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["account_manager", "marketing", "billing", "client"],
  },
  {
    href: "/app",
    label: "Executive Dashboard",
    icon: LayoutDashboard,
    roles: ["agency_manager"],
  },
  {
    href: "/app/clients",
    label: "My Clients",
    icon: Users,
    roles: ["account_manager"],
  },
  {
    href: "/app/clients",
    label: "Clients",
    icon: Users,
    roles: ["agency_manager", "billing"],
  },
  {
    href: "/app/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    roles: ["account_manager", "agency_manager", "marketing", "client"],
  },
  {
    href: "/app/profitability",
    label: "Client Profitability",
    icon: LineChart,
    roles: ["account_manager"],
  },
  {
    href: "/app/profitability",
    label: "Profitability",
    icon: LineChart,
    roles: ["agency_manager"],
  },
  {
    href: "/app/metrics",
    label: "Marketing Metrics",
    icon: BarChart3,
    roles: ["account_manager"],
  },
  {
    href: "/app/employees",
    label: "Employees",
    icon: UserCog,
    roles: ["agency_manager"],
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: Activity,
    roles: ["agency_manager", "account_manager"],
  },
  {
    href: "/app/contracts",
    label: "Contracts",
    icon: FileText,
    roles: ["agency_manager", "account_manager", "billing", "client"],
  },
  {
    href: "/app/accounting",
    label: "Accounting",
    icon: Calculator,
    roles: ["agency_manager"],
  },
  {
    href: "/app/billing",
    label: "Billing",
    icon: Receipt,
    roles: ["agency_manager", "billing"],
  },
  {
    href: "/app/ar",
    label: "AR",
    icon: Wallet,
    roles: ["agency_manager", "billing", "client"],
  },
  {
    href: "/app/controls",
    label: "Controls",
    icon: Shield,
    roles: ["agency_manager"],
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["billing"],
  },
  // Marketing / ops (not management)
  {
    href: "/app/tasks",
    label: "My Tasks",
    icon: ClipboardList,
    roles: ["marketing", "account_manager", "billing"],
  },
  {
    href: "/app/time",
    label: "Time Entry",
    icon: Clock,
    roles: ["marketing", "account_manager", "billing"],
  },
  {
    href: "/app/work",
    label: "Work",
    icon: Briefcase,
    roles: ["marketing", "client"],
  },
  {
    href: "/app/costs",
    label: "Costs",
    icon: DollarSign,
    roles: ["account_manager"],
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: CheckSquare,
    roles: ["account_manager", "marketing", "client"],
  },
];

function dashboardTitle(role: UserRole) {
  if (role === "client") return "Customer Dashboard";
  if (role === "agency_manager") return "Executive Dashboard";
  if (role === "account_manager") return "Account Manager";
  return "Employee Dashboard";
}

export function AppShell({
  profile,
  notificationCount = 0,
  children,
}: {
  profile: Profile;
  notificationCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const forRole = NAV.filter((n) => n.roles.includes(profile.role));
  const isAgency = profile.role === "agency_manager";
  const isAm = profile.role === "account_manager";
  const hasNotifications = notificationCount > 0;

  const dashboards = forRole.filter((n) => n.href === "/app");
  const rest = forRole.filter((n) => n.href !== "/app");

  type NavItem = (typeof NAV)[number];
  const groups = isAgency
    ? AGENCY_NAV_GROUPS
    : isAm
      ? AM_NAV_GROUPS
      : null;

  const navSections: { label: string | null; items: NavItem[] }[] = groups
    ? [
        { label: null, items: dashboards },
        ...groups
          .map((g) => ({
            label: g.label,
            items: g.hrefs
              .map((href) => rest.find((n) => n.href === href))
              .filter(Boolean) as NavItem[],
          }))
          .filter((s) => s.items.length > 0),
      ]
    : [
        {
          label: null,
          items: [
            ...dashboards,
            ...[...rest].sort((a, b) => a.label.localeCompare(b.label)),
          ],
        },
      ];

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
                {dashboardTitle(profile.role)}
              </div>
              <div className="text-xs opacity-60">Rebel Marketing</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden min-w-0 text-right sm:block">
                <div className="truncate text-sm font-medium">{profile.full_name}</div>
                <div className="badge badge-primary badge-sm max-w-full truncate">
                  {ROLE_LABELS[profile.role]}
                </div>
              </div>
              <span className="badge badge-primary badge-sm sm:hidden">
                {ROLE_LABELS[profile.role]}
              </span>
              <Link
                href={notificationHref(profile.role)}
                className="btn btn-ghost btn-circle btn-sm relative"
                aria-label={
                  hasNotifications
                    ? `${notificationCount} notifications`
                    : "Notifications"
                }
                title={
                  hasNotifications
                    ? `${notificationCount} notification${notificationCount === 1 ? "" : "s"}`
                    : "No notifications"
                }
              >
                <Bell className="h-5 w-5" />
                {hasNotifications ? (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-base-100" />
                ) : null}
              </Link>
            </div>
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
            <RebelLogo className="h-10 w-auto" />
            <p className="mt-2 text-xs font-medium tracking-wide opacity-70">
              Rebel Marketing
            </p>
            <p className="text-xs opacity-50">Connected contract-to-cash</p>
          </div>
          <ul className="menu gap-1">
            {navSections.flatMap((section) => {
              const links = section.items.map((item) => {
                const active =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className={`min-w-0 whitespace-normal leading-snug ${active ? "active" : ""}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="break-words">{item.label}</span>
                    </Link>
                  </li>
                );
              });
              if (!section.label) return links;
              return [
                <li
                  key={`title-${section.label}`}
                  className="menu-title mt-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider opacity-50"
                >
                  <span>{section.label}</span>
                </li>,
                ...links,
              ];
            })}
          </ul>
          <div className="mt-auto rounded-box bg-base-100 p-3 text-xs opacity-70">
            Viewing as <strong>{ROLE_LABELS[profile.role]}</strong>
            {profile.role === "client"
              ? " · Customer portal"
              : " · Employee workspace"}
            . Switch accounts from the login page to demo other roles.
          </div>
        </aside>
      </div>
    </div>
  );
}
