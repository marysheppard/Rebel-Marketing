"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PeriodKey } from "@/lib/period";
import { parsePeriodParam } from "@/lib/period-url";

export { parsePeriodParam, withPeriod } from "@/lib/period-url";

/** Read `?period=` and keep it in the URL when the period changes. */
export function usePeriodParam(fallback: PeriodKey = "ytd") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const period = useMemo(
    () =>
      parsePeriodParam(
        new URLSearchParams(searchKey).get("period"),
        fallback,
      ),
    [searchKey, fallback],
  );

  const setPeriod = useCallback(
    (next: PeriodKey) => {
      const params = new URLSearchParams(searchKey);
      if (next === fallback) params.delete("period");
      else params.set("period", next);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchKey, fallback],
  );

  return { period, setPeriod };
}
