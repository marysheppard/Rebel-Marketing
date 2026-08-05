import Link from "next/link";
import { Bell } from "lucide-react";

export function AlertsButton({
  count,
  href = "/app/alerts",
}: {
  count: number;
  href?: string;
}) {
  return (
    <Link href={href} className="btn btn-outline btn-sm indicator gap-2">
      {count > 0 ? (
        <span className="badge indicator-item badge-error badge-sm">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
      <Bell className="h-4 w-4" />
      Alerts
    </Link>
  );
}
