import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { validateChatRequest } from "@/controllers/chatController";
import { FAQ_SYSTEM_PROMPT } from "@/lib/faq-knowledge";
import {
  CONNECTION_ERROR,
  generateChatCompletion,
} from "@/services/openaiService";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

function messageTextLength(message: UIMessage): number {
  if (!Array.isArray(message.parts)) return 0;
  return message.parts.reduce((sum, part) => {
    if (part.type === "text" && typeof part.text === "string") {
      return sum + part.text.length;
    }
    return sum;
  }, 0);
}

/** Public homepage FAQ chat (AI Gateway streaming). */
async function handleFaqChat(req: Request, messages: UIMessage[]) {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return Response.json(
      {
        error:
          "FAQ chat is not configured. Add AI_GATEWAY_API_KEY to .env.local.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: `At most ${MAX_MESSAGES} messages allowed.` },
      { status: 400 },
    );
  }

  for (const message of messages) {
    if (messageTextLength(message) > MAX_CHARS_PER_MESSAGE) {
      return Response.json({ error: "Message too long." }, { status: 400 });
    }
  }

  const result = streamText({
    model: "openai/gpt-5.4-mini",
    system: FAQ_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 512,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

/** In-app Rebel Assistant (OpenAI Chat Completions). */
async function handleAssistantChat(body: {
  message?: unknown;
  context?: unknown;
  history?: unknown;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI assistant is not configured. Add OPENAI_API_KEY to .env.local.",
      },
      { status: 503 },
    );
  }

  const validated = validateChatRequest(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validated.status },
    );
  }

  try {
    const result = await generateChatCompletion(validated.data);
    return NextResponse.json({ message: result.content });
  } catch (err) {
    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      return NextResponse.json(
        {
          error:
            "AI assistant is not configured. Add OPENAI_API_KEY to .env.local.",
        },
        { status: 503 },
      );
    }
    console.error("[api/chat] assistant error:", err);
    return NextResponse.json({ error: CONNECTION_ERROR }, { status: 502 });
  }
}

/**
 * POST /api/chat
 * - Homepage FAQ: body.messages (AI SDK UIMessage[]) → streaming gateway
 * - In-app assistant: body.message (+ context/history) → OpenAI JSON
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (Array.isArray(body.messages)) {
    return handleFaqChat(req, body.messages as UIMessage[]);
  }

  return handleAssistantChat(body);
}
