"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  INVOICE_STATUS_STACK_KEYS,
  INVOICE_STATUS_STACK_META,
  invoiceStatusAmountStack,
  type BillingInvoiceRow,
  type InvoiceStatusStackKey,
} from "@/lib/billing";
import { money } from "@/lib/format";

export function InvoiceStatusBar({ invoices }: { invoices: BillingInvoiceRow[] }) {
  const stack = invoiceStatusAmountStack(invoices);
  const activeKeys = INVOICE_STATUS_STACK_KEYS.filter((k) => stack.amounts[k] > 0);

  const row: Record<string, string | number> = { name: "mix" };
  for (const k of INVOICE_STATUS_STACK_KEYS) {
    row[k] = stack.amounts[k];
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
        Invoice mix by status
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1" style={{ height: 40 }}>
          {stack.total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[row]}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                barCategoryGap={0}
              >
                <XAxis type="number" hide domain={[0, stack.total]} />
                <YAxis type="category" dataKey="name" hide width={0} />
                <Tooltip
                  formatter={(value, name) => {
                    const key = String(name) as InvoiceStatusStackKey;
                    const label =
                      INVOICE_STATUS_STACK_META[key]?.label ?? String(name);
                    return [money(Number(value ?? 0)), label];
                  }}
                  labelFormatter={() => "Invoices"}
                  contentStyle={{ fontSize: 12 }}
                />
                {activeKeys.map((k) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="status"
                    fill={INVOICE_STATUS_STACK_META[k].color}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center rounded bg-base-200/80 px-3 text-xs text-slate-500">
              No invoice amounts yet
            </div>
          )}
        </div>
        <p className="shrink-0 text-xs text-slate-500">
          {stack.count} invoice{stack.count === 1 ? "" : "s"} · {money(stack.total)}
        </p>
      </div>
      {activeKeys.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {activeKeys.map((k) => (
            <li
              key={k}
              className="flex items-center gap-1.5 text-[11px] text-slate-600"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: INVOICE_STATUS_STACK_META[k].color }}
              />
              {INVOICE_STATUS_STACK_META[k].label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
