"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Have a good day.",
  "Hope your day’s going well.",
  "Let’s make today count.",
  "Glad you’re here — have a great day.",
  "Wishing you a productive day.",
  "Take a breath and have a good one.",
  "Here’s to a smooth day ahead.",
  "You’ve got this — enjoy the day.",
];

const STORAGE_KEY = "rebel-welcome-msg";

export function WelcomeMessage() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessage(saved);
        return;
      }
      const next = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]!;
      sessionStorage.setItem(STORAGE_KEY, next);
      setMessage(next);
    } catch {
      setMessage(MESSAGES[0]!);
    }
  }, []);

  if (!message) {
    return <span className="inline-block min-h-[1.25em]">&nbsp;</span>;
  }

  return <>{message}</>;
}
