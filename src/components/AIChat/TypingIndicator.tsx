"use client";

type TypingIndicatorProps = {
  label?: string;
};

export function TypingIndicator({ label = "Assistant is thinking" }: TypingIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2 px-1 py-2 text-xs opacity-70"
      aria-live="polite"
      aria-label={label}
    >
      <span className="ai-typing-dot" />
      <span className="ai-typing-dot" style={{ animationDelay: "120ms" }} />
      <span className="ai-typing-dot" style={{ animationDelay: "240ms" }} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
