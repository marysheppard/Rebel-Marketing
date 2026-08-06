"use client";

import { useEffect, useMemo, useState } from "react";
import {
  layoutStorageKey,
  readLayoutPrefs,
  visibleOrderedSections,
  writeLayoutPrefs,
  type DashboardLayoutPrefs,
  type DashboardSectionDef,
} from "@/lib/dashboard-layout";

export function useDashboardLayout<Id extends string>({
  userId,
  storagePrefix,
  sections,
}: {
  userId: string;
  storagePrefix: string;
  sections: readonly DashboardSectionDef<Id>[];
}) {
  const allIds = useMemo(
    () => sections.map((s) => s.id) as Id[],
    [sections],
  );
  const defaults: DashboardLayoutPrefs<Id> = useMemo(
    () => ({ order: [...allIds], hidden: [] }),
    [allIds],
  );

  const [prefs, setPrefs] = useState<DashboardLayoutPrefs<Id>>(defaults);
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const storageKey = layoutStorageKey(storagePrefix, userId);

  useEffect(() => {
    setPrefs(readLayoutPrefs(storageKey, allIds));
    setReady(true);
  }, [storageKey, allIds]);

  function updatePrefs(next: DashboardLayoutPrefs<Id>) {
    setPrefs(next);
    writeLayoutPrefs(storageKey, next, allIds);
  }

  const visible = useMemo(
    () =>
      ready
        ? visibleOrderedSections(prefs)
        : visibleOrderedSections(defaults),
    [prefs, ready, defaults],
  );

  function toggleHidden(id: Id) {
    const hidden = prefs.hidden.includes(id)
      ? prefs.hidden.filter((h) => h !== id)
      : [...prefs.hidden, id];
    updatePrefs({ ...prefs, hidden });
  }

  function move(id: Id, dir: -1 | 1) {
    const idx = prefs.order.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= prefs.order.length) return;
    const order = [...prefs.order];
    [order[idx], order[swap]] = [order[swap]!, order[idx]!];
    updatePrefs({ ...prefs, order });
  }

  function restoreDefaults() {
    updatePrefs({ order: [...allIds], hidden: [] });
  }

  return {
    prefs,
    ready,
    visible,
    panelOpen,
    setPanelOpen,
    toggleHidden,
    move,
    restoreDefaults,
    sections,
  };
}
