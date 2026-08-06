/**
 * Chat request validation + controller helpers for POST /api/chat.
 * Keeps the Next.js route thin and reusable.
 */

import type { ChatAppContext, ChatHistoryItem } from "@/services/openaiService";

export type ChatRequestBody = {
  message?: unknown;
  context?: unknown;
  history?: unknown;
};

export type ValidatedChatRequest = {
  message: string;
  context: ChatAppContext;
  history: ChatHistoryItem[];
};

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

function parseContext(raw: unknown): ChatAppContext {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as Record<string, unknown>;
  return {
    page: asOptionalString(c.page),
    pathname: asOptionalString(c.pathname),
    client: asOptionalString(c.client),
    contract: asOptionalString(c.contract),
    campaign: asOptionalString(c.campaign),
    invoice: asOptionalString(c.invoice),
    role: asOptionalString(c.role),
  };
}

function parseHistory(raw: unknown): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ChatHistoryItem[] = [];
  for (const entry of raw.slice(-12)) {
    if (!entry || typeof entry !== "object") continue;
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      continue;
    }
    const text = content.trim();
    if (!text) continue;
    items.push({ role, content: text.slice(0, 4000) });
  }
  return items;
}

export function validateChatRequest(body: ChatRequestBody): {
  ok: true;
  data: ValidatedChatRequest;
} | {
  ok: false;
  error: string;
  status: number;
} {
  if (typeof body.message !== "string") {
    return { ok: false, error: "Message must be a string.", status: 400 };
  }

  const message = body.message.trim();
  if (!message) {
    return { ok: false, error: "Message is required.", status: 400 };
  }
  if (message.length > 4000) {
    return {
      ok: false,
      error: "Message is too long (max 4000 characters).",
      status: 400,
    };
  }

  return {
    ok: true,
    data: {
      message,
      context: parseContext(body.context),
      history: parseHistory(body.history),
    },
  };
}
