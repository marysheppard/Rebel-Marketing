/** Shared dashboard section layout prefs (show/hide + order) via localStorage. */

export type DashboardSectionDef<Id extends string = string> = {
  id: Id;
  label: string;
  description: string;
};

export type DashboardLayoutPrefs<Id extends string = string> = {
  order: Id[];
  hidden: Id[];
};

export function layoutStorageKey(prefix: string, userId: string) {
  return `${prefix}:${userId}`;
}

export function normalizeLayoutPrefs<Id extends string>(
  raw: unknown,
  allIds: readonly Id[],
): DashboardLayoutPrefs<Id> {
  const idSet = new Set(allIds);

  if (!raw || typeof raw !== "object") {
    return { order: [...allIds], hidden: [] };
  }

  const obj = raw as Partial<DashboardLayoutPrefs<Id>>;
  const orderRaw = Array.isArray(obj.order) ? obj.order : [];
  const hiddenRaw = Array.isArray(obj.hidden) ? obj.hidden : [];

  const order: Id[] = [];
  for (const id of orderRaw) {
    if (idSet.has(id as Id) && !order.includes(id as Id)) {
      order.push(id as Id);
    }
  }
  for (const id of allIds) {
    if (!order.includes(id)) order.push(id);
  }

  const hidden = hiddenRaw.filter((id): id is Id => idSet.has(id as Id));

  return { order, hidden };
}

export function readLayoutPrefs<Id extends string>(
  storageKey: string,
  allIds: readonly Id[],
): DashboardLayoutPrefs<Id> {
  const fallback: DashboardLayoutPrefs<Id> = {
    order: [...allIds],
    hidden: [],
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    return normalizeLayoutPrefs(JSON.parse(raw), allIds);
  } catch {
    return fallback;
  }
}

export function writeLayoutPrefs<Id extends string>(
  storageKey: string,
  prefs: DashboardLayoutPrefs<Id>,
  allIds: readonly Id[],
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(normalizeLayoutPrefs(prefs, allIds)),
  );
}

export function visibleOrderedSections<Id extends string>(
  prefs: DashboardLayoutPrefs<Id>,
): Id[] {
  const hidden = new Set(prefs.hidden);
  return prefs.order.filter((id) => !hidden.has(id));
}
