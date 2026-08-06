import type { ChatAction } from "@/components/AIChat/types";
import { getPageByPath, type KnowledgePage } from "@/services/knowledgeBase";
import type { UserRole } from "@/lib/types";

const ROLE_PATHS: Record<UserRole, string[]> = {
  agency_manager: [
    "/app",
    "/app/clients",
    "/app/contracts",
    "/app/campaigns",
    "/app/work",
    "/app/costs",
    "/app/approvals",
    "/app/billing",
    "/app/ar",
    "/app/reports",
  ],
  account_manager: [
    "/app",
    "/app/clients",
    "/app/contracts",
    "/app/campaigns",
    "/app/work",
    "/app/costs",
    "/app/approvals",
    "/app/billing",
    "/app/ar",
    "/app/reports",
  ],
  marketing: [
    "/app",
    "/app/campaigns",
    "/app/work",
    "/app/costs",
    "/app/approvals",
  ],
  billing: [
    "/app",
    "/app/clients",
    "/app/contracts",
    "/app/campaigns",
    "/app/work",
    "/app/costs",
    "/app/billing",
    "/app/ar",
    "/app/reports",
  ],
  client: ["/app", "/app/contracts", "/app/change-requests"],
};

export function canAccessPath(role: UserRole, href: string): boolean {
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("http://") ||
    href.startsWith("https://")
  ) {
    return true;
  }
  const allowed = ROLE_PATHS[role] ?? ["/app"];
  return allowed.some(
    (path) => href === path || (path !== "/app" && href.startsWith(path + "/")),
  );
}

export function filterActionsForRole(
  actions: ChatAction[],
  role?: UserRole,
): ChatAction[] {
  if (!role) return actions;
  return actions.filter((a) => canAccessPath(role, a.href));
}

export function getSmartSuggestions(
  pathname: string,
  role?: UserRole,
): ChatAction[] {
  let actions: ChatAction[] = [];

  if (pathname.startsWith("/app/contracts")) {
    actions = [
      { label: "Create Contract", href: "/app/contracts" },
      { label: "View Clients", href: "/app/clients" },
      { label: "Generate Invoice", href: "/app/billing" },
    ];
  } else if (
    pathname.startsWith("/app/billing") ||
    pathname.startsWith("/app/ar")
  ) {
    actions = [
      { label: "Outstanding invoices", href: "/app/ar" },
      { label: "Record payment", href: "/app/ar" },
      { label: "Reports", href: "/app/reports" },
    ];
  } else if (pathname === "/app") {
    actions = [
      { label: "Billing", href: "/app/billing" },
      { label: "Profitability report", href: "/app/reports" },
      { label: "Campaign performance", href: "/app/campaigns" },
    ];
  } else if (pathname.startsWith("/app/clients")) {
    actions = [
      { label: "Create client", href: "/app/clients" },
      { label: "Contracts", href: "/app/contracts" },
      { label: "Reports", href: "/app/reports" },
    ];
  } else if (pathname.startsWith("/app/campaigns")) {
    actions = [
      { label: "Create campaign", href: "/app/campaigns" },
      { label: "Log work", href: "/app/work" },
      { label: "Record costs", href: "/app/costs" },
    ];
  } else if (pathname.startsWith("/app/work")) {
    actions = [
      { label: "Log work", href: "/app/work" },
      { label: "Campaigns", href: "/app/campaigns" },
      { label: "Billing", href: "/app/billing" },
    ];
  } else if (pathname.startsWith("/app/costs")) {
    actions = [
      { label: "Record cost", href: "/app/costs" },
      { label: "Campaigns", href: "/app/campaigns" },
      { label: "Reports", href: "/app/reports" },
    ];
  } else if (pathname.startsWith("/app/reports")) {
    actions = [
      { label: "Profitability", href: "/app/reports" },
      { label: "Billing", href: "/app/billing" },
      { label: "Costs", href: "/app/costs" },
    ];
  } else {
    const page = getPageByPath(pathname);
    if (page) {
      actions = page.actions.slice(0, 3).map((label) => ({
        label,
        href: page.path,
      }));
    } else {
      actions = [
        { label: "Dashboard", href: "/app" },
        { label: "Help: Contracts", href: "/app/contracts" },
        { label: "Help: Billing", href: "/app/billing" },
      ];
    }
  }

  return role ? filterActionsForRole(actions, role) : actions;
}

export function describePage(page: KnowledgePage): string {
  return `You're on **${page.title}** (${page.menu} in the sidebar).\n\n${page.summary}\n\nTypical next steps:\n${page.howTo.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
}

export function parseEntityFromPath(pathname: string): {
  entityType: "client" | "contract" | "campaign" | null;
  entityId: string | null;
} {
  const client = pathname.match(/^\/app\/clients\/([^/]+)/);
  if (client) return { entityType: "client", entityId: client[1] };
  const contract = pathname.match(/^\/app\/contracts\/([^/]+)/);
  if (contract) return { entityType: "contract", entityId: contract[1] };
  const campaign = pathname.match(/^\/app\/campaigns\/([^/]+)/);
  if (campaign) return { entityType: "campaign", entityId: campaign[1] };
  return { entityType: null, entityId: null };
}

export const SUGGESTED_QUESTIONS = [
  "How do I create a client?",
  "How do retainers work?",
  "Where do I record expenses?",
  "How do invoices work?",
  "Show me campaign reports.",
  "What are pass-through costs?",
  "How do I create a contract?",
  "What does this page do?",
];
