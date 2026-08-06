"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  DashboardLayoutPrefs,
  DashboardSectionDef,
} from "@/lib/dashboard-layout";

export function DashboardCustomizePanel<Id extends string>({
  prefs,
  sections,
  onClose,
  onToggle,
  onMove,
  onRestore,
}: {
  prefs: DashboardLayoutPrefs<Id>;
  sections: readonly DashboardSectionDef<Id>[];
  onClose: () => void;
  onToggle: (id: Id) => void;
  onMove: (id: Id, dir: -1 | 1) => void;
  onRestore: () => void;
}) {
  return (
    <>
      {/* Above Leaflet panes/controls (z-index ~400–1000) */}
      <button
        type="button"
        className="fixed inset-0 z-[1100] bg-black/30"
        aria-label="Close customize panel"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[1200] flex w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-2xl"
        role="dialog"
        aria-label="Customize dashboard layout"
      >
        <header className="flex items-start justify-between gap-3 border-b border-base-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Customize layout
            </h2>
            <p className="mt-0.5 text-sm opacity-60">
              Show, hide, or reorder dashboard sections. Changes save
              automatically.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ul className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {prefs.order.map((id, index) => {
            const meta = sections.find((s) => s.id === id)!;
            const hidden = prefs.hidden.includes(id);
            return (
              <li
                key={id}
                className={`rounded-xl border border-base-200 p-3 ${
                  hidden ? "opacity-55" : "bg-base-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <p className="text-xs opacity-55">{meta.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label={`Move ${meta.label} up`}
                      disabled={index === 0}
                      onClick={() => onMove(id, -1)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label={`Move ${meta.label} down`}
                      disabled={index === prefs.order.length - 1}
                      onClick={() => onMove(id, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-2 gap-1"
                  onClick={() => onToggle(id)}
                >
                  {hidden ? (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="border-t border-base-200 px-5 py-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm w-full gap-2"
            onClick={onRestore}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore defaults
          </button>
        </footer>
      </aside>
    </>
  );
}

export function CustomizeLayoutButton({
  onClick,
  className = "btn btn-outline btn-sm gap-2",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      <Pencil className="h-3.5 w-3.5" />
      Customize layout
    </button>
  );
}
