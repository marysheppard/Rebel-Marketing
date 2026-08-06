"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, X } from "lucide-react";
import { useMemo, useState } from "react";

const SUGGESTIONS = [
  "What services do you offer?",
  "Client vs Admin login?",
  "How do I contact you?",
];

export function PublicFaqChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="pointer-events-auto flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#0b1f3a14] bg-white shadow-[0_20px_50px_#0b1f3a22]">
          <div className="flex items-start justify-between gap-3 bg-[#0b1f3a] px-4 py-3 text-white">
            <div>
              <div className="text-sm font-bold tracking-tight">Ask Rebel</div>
              <div className="text-[11px] text-white/70">
                FAQ — public info only
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-[#1e3a5f]/90">
                  Ask about services, how we work, or how to sign in. This bot
                  only knows public Rebel Marketing info.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="rounded-full border border-[#0b1f3a18] bg-[#f7f9fc] px-3 py-1.5 text-left text-xs font-medium text-[#0b1f3a] hover:border-[#0b1f3a]"
                      disabled={busy}
                      onClick={() => submit(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto bg-[#0b1f3a] text-white"
                    : "bg-[#eef3f9] text-[#0b1f3a]"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="whitespace-pre-wrap"
                      >
                        {part.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}

            {busy ? (
              <p className="text-xs font-medium text-[#1e3a5f]/60">
                Thinking…
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error.message ||
                  "Chat unavailable. Check AI_GATEWAY_API_KEY in .env.local."}
              </p>
            ) : null}
          </div>

          <form
            className="border-t border-[#0b1f3a10] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <div className="flex gap-2">
              <input
                className="input input-sm flex-1 border-[#0b1f3a18] bg-[#f7f9fc] text-[#0b1f3a] focus:border-[#0b1f3a]"
                value={input}
                placeholder="Ask a question…"
                onChange={(e) => setInput(e.currentTarget.value)}
                disabled={busy}
              />
              <button
                type="submit"
                className="btn btn-sm border-none bg-[#0b1f3a] text-white hover:bg-[#163054]"
                disabled={busy || !input.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#163054]"
        aria-expanded={open}
        aria-label={open ? "Close Ask Rebel chat" : "Open Ask Rebel chat"}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="h-4 w-4" />
        Ask Rebel
      </button>
    </div>
  );
}
