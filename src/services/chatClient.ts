/**
 * Browser-safe chat client. Talks only to our backend — never to OpenAI directly.
 */

export type ChatApiContext = {
  page?: string | null;
  pathname?: string | null;
  client?: string | null;
  contract?: string | null;
  campaign?: string | null;
  invoice?: string | null;
  role?: string | null;
};

export type ChatApiHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ChatApiSuccess = {
  ok: true;
  message: string;
};

export type ChatApiFailure = {
  ok: false;
  error: string;
  status: number;
  retryable: boolean;
};

export async function postChatMessage(input: {
  message: string;
  context?: ChatApiContext;
  history?: ChatApiHistoryItem[];
  signal?: AbortSignal;
}): Promise<ChatApiSuccess | ChatApiFailure> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        context: input.context ?? {},
        history: input.history ?? [],
      }),
      signal: input.signal,
    });

    let data: { message?: string; error?: string } = {};
    try {
      data = (await res.json()) as { message?: string; error?: string };
    } catch {
      data = {};
    }

    if (!res.ok) {
      return {
        ok: false,
        error:
          data.error ||
          data.message ||
          "I'm having trouble connecting to the AI service right now. Please try again in a moment.",
        status: res.status,
        retryable: res.status >= 500 || res.status === 429,
      };
    }

    const message = data.message?.trim();
    if (!message) {
      return {
        ok: false,
        error: "The AI returned an empty response. Please try again.",
        status: 502,
        retryable: true,
      };
    }

    return { ok: true, message };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        ok: false,
        error: "Request was cancelled.",
        status: 499,
        retryable: true,
      };
    }
    return {
      ok: false,
      error:
        "I'm having trouble connecting to the AI service right now. Please try again in a moment.",
      status: 0,
      retryable: true,
    };
  }
}
