"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  subtitle,
  summary,
  children,
  defaultOpen = true,
  id,
  className = "",
  headerClassName = "",
}: {
  title: string;
  subtitle?: string;
  /** Light necessary data shown when collapsed */
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
  headerClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reactId = useId();
  const bodyId = id ? `${id}-body` : `collapse-${reactId}`;

  return (
    <section
      id={id}
      className={`rounded-box border border-base-300 bg-base-100 shadow-sm ${className}`}
    >
      <button
        type="button"
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-base-200/40 sm:px-5 ${
          open ? "border-b border-base-300" : ""
        } ${headerClassName}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-[#0b1f3a]">{title}</h2>
          {open && subtitle ? (
            <p className="mt-0.5 text-sm opacity-65">{subtitle}</p>
          ) : null}
          {!open && summary ? (
            <div className="mt-1 text-sm opacity-70">{summary}</div>
          ) : null}
        </div>
        <span
          className="btn btn-ghost btn-sm btn-square pointer-events-none shrink-0"
          aria-hidden
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? "rotate-0" : "-rotate-90"
            }`}
          />
        </span>
      </button>
      {open ? <div id={bodyId}>{children}</div> : null}
    </section>
  );
}
