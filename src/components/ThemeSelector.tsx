"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const THEMES = [
  "dark",
  "corporate",
  "business",
  "synthwave",
  "cyberpunk",
  "night",
  "dim",
] as const;

export function ThemeSelector({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<string>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rebel-theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    setReady(true);
  }, []);

  function onChange(next: string) {
    setTheme(next);
    localStorage.setItem("rebel-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  if (!ready) {
    return (
      <div className={`flex h-8 w-28 items-center gap-2 ${className}`}>
        <Palette className="h-4 w-4 opacity-70" />
        <span className="text-xs opacity-50">Theme</span>
      </div>
    );
  }

  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <Palette className="h-4 w-4 opacity-70" />
      <select
        className="select select-bordered select-sm"
        value={theme}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Theme"
      >
        {THEMES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
