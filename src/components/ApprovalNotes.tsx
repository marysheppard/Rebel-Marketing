type NoteEntry =
  | { kind: "thread"; role: "Client" | "Staff"; status: string; date: string; message: string }
  | { kind: "plain"; text: string };

const THREAD_RE =
  /^\[(Client|Staff)\s*·\s*(.+?)\s*·\s*(\d{4}-\d{2}-\d{2})\]\s*(.*)$/;

function parseApprovalNotes(notes: string): NoteEntry[] {
  const lines = notes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: NoteEntry[] = [];
  const plain: string[] = [];

  for (const line of lines) {
    const match = line.match(THREAD_RE);
    if (match) {
      if (plain.length) {
        entries.push({ kind: "plain", text: plain.join("\n") });
        plain.length = 0;
      }
      entries.push({
        kind: "thread",
        role: match[1] as "Client" | "Staff",
        status: match[2].trim(),
        date: match[3],
        message: match[4].trim(),
      });
    } else {
      plain.push(line);
    }
  }
  if (plain.length) {
    entries.push({ kind: "plain", text: plain.join("\n") });
  }
  return entries;
}

export function ApprovalNotes({
  notes,
  compact = false,
}: {
  notes: string;
  compact?: boolean;
}) {
  const trimmed = notes.trim();
  if (!trimmed) return null;

  const entries = parseApprovalNotes(trimmed);
  if (!entries.length) return null;

  return (
    <div className={`flex flex-col gap-2 ${compact ? "mt-1" : "mt-2"}`}>
      {entries.map((entry, i) => {
        if (entry.kind === "plain") {
          return (
            <div
              key={`plain-${i}`}
              className="rounded-lg border border-base-300 bg-base-200/60 px-3 py-2 text-xs"
            >
              <div className="mb-0.5 font-medium opacity-60">Request notes</div>
              <p className="whitespace-pre-wrap opacity-90">{entry.text}</p>
            </div>
          );
        }

        const isClient = entry.role === "Client";
        return (
          <div
            key={`thread-${i}`}
            className={`rounded-lg border px-3 py-2 text-xs ${
              isClient
                ? "border-warning/40 bg-warning/10"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`badge badge-sm ${isClient ? "badge-warning" : "badge-primary"}`}
              >
                {entry.role}
              </span>
              <span className="opacity-60">{entry.status}</span>
              <span className="opacity-50">{entry.date}</span>
            </div>
            {entry.message ? (
              <p className="whitespace-pre-wrap opacity-90">{entry.message}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
