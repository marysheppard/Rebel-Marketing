"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function CostsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Costs page error:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Costs & expenses</h1>
        <p className="mt-1 opacity-70">Track campaign and engagement spend for client profitability.</p>
      </div>

      <div className="alert alert-error shadow-sm">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">This page hit an unexpected error</div>
          <div className="text-sm opacity-90">
            Your data is safe. Try again — if it keeps happening, refresh the browser.
          </div>
        </div>
        <button type="button" className="btn btn-sm" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
