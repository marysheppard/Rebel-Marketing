"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Send, Sparkles, Trash2, X } from "lucide-react";
import { MessageBubble } from "@/components/AIChat/MessageBubble";
import { SuggestedQuestions } from "@/components/AIChat/SuggestedQuestions";
import { TypingIndicator } from "@/components/AIChat/TypingIndicator";
import type { ChatAction, ChatMessage } from "@/components/AIChat/types";
import { postChatMessage } from "@/services/chatClient";
import { getPageByPath } from "@/services/knowledgeBase";
import {
  getSmartSuggestions,
  parseEntityFromPath,
  SUGGESTED_QUESTIONS,
} from "@/services/navigationService";
import type { UserRole } from "@/lib/types";
import { SUPPORT_CONTACT } from "@/data/supportContact";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type ChatWindowProps = {
  pathname: string;
  userId: string;
  role: UserRole;
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
};

const STORAGE_PREFIX = "rebel-ai-chat:";

function loadMessages(userId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(userId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

export function ChatWindow({
  pathname,
  userId,
  role,
  minimized,
  onMinimize,
  onClose,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const smartActions: ChatAction[] = getSmartSuggestions(pathname, role);

  useEffect(() => {
    setMessages(loadMessages(userId));
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(userId, messages);
  }, [messages, userId, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, minimized]);

  useEffect(() => {
    if (!minimized) inputRef.current?.focus();
  }, [minimized]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setTyping(true);

    try {
      const entity = parseEntityFromPath(pathname);
      const page = getPageByPath(pathname);
      const history = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const result = await postChatMessage({
        message: trimmed,
        context: {
          page: page?.title ?? null,
          pathname,
          role,
          client: entity.entityType === "client" ? entity.entityId : null,
          contract: entity.entityType === "contract" ? entity.entityId : null,
          campaign: entity.entityType === "campaign" ? entity.entityId : null,
        },
        history,
      });

      if (!result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: result.error,
            failed: true,
            retryOf: trimmed,
            actions: [
              {
                label: `Email ${SUPPORT_CONTACT.email}`,
                href: SUPPORT_CONTACT.emailHref,
              },
            ],
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: result.message,
          actions: smartActions.slice(0, 2),
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: `Something went wrong. Please email support at ${SUPPORT_CONTACT.email}.`,
          failed: true,
          retryOf: trimmed,
          actions: [
            {
              label: `Email ${SUPPORT_CONTACT.email}`,
              href: SUPPORT_CONTACT.emailHref,
            },
          ],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function clearChat() {
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_PREFIX + userId);
    } catch {
      /* ignore */
    }
  }

  if (minimized) return null;

  return (
    <section
      className="ai-chat-window fixed bottom-24 right-4 z-50 flex w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl sm:right-6"
      role="dialog"
      aria-label="Rebel help assistant"
    >
      <header className="flex items-center justify-between gap-2 bg-primary px-3 py-2.5 text-primary-content">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-content/15">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">
              Rebel Assistant
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="btn btn-ghost btn-xs text-primary-content"
            aria-label="Clear conversation"
            onClick={clearChat}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs text-primary-content"
            aria-label="Minimize"
            onClick={onMinimize}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs text-primary-content"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex max-h-[min(70vh,32rem)] min-h-[18rem] flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-base-300 bg-base-200/60 p-3 text-sm">
                <p className="font-semibold">Hi — how can I help?</p>
                <p className="mt-1 text-xs opacity-70">
                  Ask about contracts, invoices, retainers, campaigns, expenses,
                  or what this page does.
                </p>
              </div>
              <SuggestedQuestions
                questions={SUGGESTED_QUESTIONS}
                onSelect={(q) => void sendText(q)}
              />
              {smartActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">
                    Suggestions for this page
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {smartActions.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() =>
                          void sendText(`Help me with: ${a.label}`)
                        }
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-base-300 bg-base-100 p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendText(input);
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendText(input);
                }
              }}
              placeholder="Ask how to do something…"
              className="textarea textarea-bordered textarea-sm max-h-28 min-h-[2.5rem] flex-1 resize-none leading-snug"
              disabled={typing}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={typing || !input.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
