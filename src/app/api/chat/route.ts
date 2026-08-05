import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { FAQ_SYSTEM_PROMPT } from "@/lib/faq-knowledge";

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

export async function POST(req: Request) {
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

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages required." }, { status: 400 });
  }

  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: `At most ${MAX_MESSAGES} messages allowed.` },
      { status: 400 },
    );
  }

  for (const message of messages) {
    if (messageTextLength(message) > MAX_CHARS_PER_MESSAGE) {
      return Response.json(
        { error: "Message too long." },
        { status: 400 },
      );
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
