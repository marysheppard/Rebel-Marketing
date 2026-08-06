"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import { ChatWindow } from "@/components/AIChat/ChatWindow";

type ChatWidgetProps = {
  /** Used to scope sessionStorage conversation per logged-in user */
  userId: string;
  role: import("@/lib/types").UserRole;
};

/**
 * Floating help assistant entry point.
 * Mount inside AppShell so it appears on all authenticated app pages.
 */
export function ChatWidget({ userId, role }: ChatWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setMinimized(false);
  }, []);

  // Escape closes the panel
  useEffect(() => {
    if (!open || minimized) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, minimized, close]);

  return (
    <>
      {open && (
        <ChatWindow
          pathname={pathname}
          userId={userId}
          role={role}
          minimized={minimized}
          onMinimize={() => setMinimized(true)}
          onClose={close}
        />
      )}

      <button
        type="button"
        className="ai-chat-fab btn btn-primary btn-circle fixed bottom-5 right-4 z-50 h-14 w-14 shadow-lg sm:right-6"
        aria-label={open && !minimized ? "Minimize help assistant" : "Open help assistant"}
        aria-expanded={open && !minimized}
        onClick={() => {
          if (!open) {
            setOpen(true);
            setMinimized(false);
            return;
          }
          if (minimized) {
            setMinimized(false);
            return;
          }
          setMinimized(true);
        }}
      >
        {open && !minimized ? (
          <MessageCircle className="h-6 w-6" />
        ) : (
          <Sparkles className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
