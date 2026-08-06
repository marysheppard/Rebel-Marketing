/** Employee dashboard section layout prefs (show/hide + order). */

export const EMPLOYEE_DASHBOARD_SECTIONS = [
  {
    id: "tasks",
    label: "Pressing tasks",
    description: "Your highest-priority open work",
  },
  {
    id: "map",
    label: "Client map",
    description: "Locations for clients you’re on",
  },
  {
    id: "performance",
    label: "Campaign performance",
    description: "Clicks by assigned campaign",
  },
  {
    id: "schedule",
    label: "Schedule",
    description: "Tasks, campaigns, and events calendar",
  },
  {
    id: "task_mix",
    label: "Task mix",
    description: "Your tasks broken down by status",
  },
  {
    id: "task_priority",
    label: "Tasks by priority",
    description: "Open work by urgency",
  },
  {
    id: "hours",
    label: "Hours this week",
    description: "Time logged by day this week",
  },
  {
    id: "metrics_trend",
    label: "Impressions & clicks trend",
    description: "Assigned campaign metrics over time",
  },
  {
    id: "ctr",
    label: "CTR by campaign",
    description: "Click-through rate for assigned campaigns",
  },
] as const;

export type EmployeeDashboardSectionId =
  (typeof EMPLOYEE_DASHBOARD_SECTIONS)[number]["id"];

export type EmployeeDashboardLayoutPrefs = {
  order: EmployeeDashboardSectionId[];
  hidden: EmployeeDashboardSectionId[];
};

/** New chart sections stay off until the user unhides them. */
const DEFAULT_HIDDEN: EmployeeDashboardSectionId[] = [
  "task_mix",
  "task_priority",
  "hours",
  "metrics_trend",
  "ctr",
];

export const DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT: EmployeeDashboardLayoutPrefs = {
  order: [
    "tasks",
    "map",
    "performance",
    "schedule",
    "task_mix",
    "task_priority",
    "hours",
    "metrics_trend",
    "ctr",
  ],
  hidden: [...DEFAULT_HIDDEN],
};

const STORAGE_PREFIX = "rebel.employee-dashboard.layout.v1";

export function layoutStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function normalizeLayoutPrefs(
  raw: unknown,
): EmployeeDashboardLayoutPrefs {
  const allIds = EMPLOYEE_DASHBOARD_SECTIONS.map((s) => s.id);
  const idSet = new Set(allIds);
  const defaultHidden = new Set(DEFAULT_HIDDEN);

  if (!raw || typeof raw !== "object") {
    return {
      order: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.order],
      hidden: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.hidden],
    };
  }

  const obj = raw as Partial<EmployeeDashboardLayoutPrefs>;
  const orderRaw = Array.isArray(obj.order) ? obj.order : [];
  const hiddenRaw = Array.isArray(obj.hidden) ? obj.hidden : [];

  const order: EmployeeDashboardSectionId[] = [];
  for (const id of orderRaw) {
    if (
      idSet.has(id as EmployeeDashboardSectionId) &&
      !order.includes(id as EmployeeDashboardSectionId)
    ) {
      order.push(id as EmployeeDashboardSectionId);
    }
  }

  const hidden: EmployeeDashboardSectionId[] = hiddenRaw.filter(
    (id): id is EmployeeDashboardSectionId =>
      idSet.has(id as EmployeeDashboardSectionId),
  );

  // Append newly registered sections; keep chart sections hidden by default.
  for (const id of allIds) {
    if (!order.includes(id)) {
      order.push(id);
      if (defaultHidden.has(id) && !hidden.includes(id)) {
        hidden.push(id);
      }
    }
  }

  return { order, hidden };
}

export function readLayoutPrefs(userId: string): EmployeeDashboardLayoutPrefs {
  if (typeof window === "undefined") {
    return {
      order: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.order],
      hidden: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.hidden],
    };
  }
  try {
    const raw = window.localStorage.getItem(layoutStorageKey(userId));
    if (!raw) {
      return {
        order: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.order],
        hidden: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.hidden],
      };
    }
    return normalizeLayoutPrefs(JSON.parse(raw));
  } catch {
    return {
      order: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.order],
      hidden: [...DEFAULT_EMPLOYEE_DASHBOARD_LAYOUT.hidden],
    };
  }
}

export function writeLayoutPrefs(
  userId: string,
  prefs: EmployeeDashboardLayoutPrefs,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    layoutStorageKey(userId),
    JSON.stringify(normalizeLayoutPrefs(prefs)),
  );
}

export function visibleOrderedSections(
  prefs: EmployeeDashboardLayoutPrefs,
): EmployeeDashboardSectionId[] {
  const hidden = new Set(prefs.hidden);
  return prefs.order.filter((id) => !hidden.has(id));
}
