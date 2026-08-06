/**
 * Server-only OpenAI integration for the Rebel help assistant.
 * The API key must never be imported or referenced from client components.
 */

import OpenAI from "openai";
import { SUPPORT_CONTACT } from "@/data/supportContact";

export const CHAT_SYSTEM_PROMPT = `You are an AI assistant for a Contract Engagement and Contract-to-Cash Management System used by a marketing agency (Rebel Marketing).

Your job is to help users:
- Navigate the application
- Explain contracts
- Explain invoices
- Explain retainers
- Explain campaign budgets
- Explain pass-through costs
- Explain profitability
- Explain client engagements

Application navigation tips (use these when giving steps):
- Clients: /app/clients — button "Create client"
- Contracts: /app/contracts — button "Create contract"
- Campaigns: /app/campaigns — button "Create campaign"
- Work (hours): /app/work — button "Log work"
- Costs / ad spend: /app/costs — button "Record cost"
- Approvals: /app/approvals
- Billing / invoices: /app/billing — button "Create invoice"
- Accounts Receivable / payments: /app/ar — button "Record payment"
- Reports / profitability: /app/reports
- Dashboard: /app

Only answer questions related to this application.
If you don't know something, say you don't know instead of making up an answer.
When you truly cannot help, direct the user to Rebel Marketing support at ${SUPPORT_CONTACT.phone} or ${SUPPORT_CONTACT.email}.
Keep responses concise and helpful.
Use short step lists when explaining how to do something in the UI.
You may use light Markdown (bold, lists, and fenced code blocks when useful).`;

export type ChatAppContext = {
  page?: string | null;
  pathname?: string | null;
  client?: string | null;
  contract?: string | null;
  campaign?: string | null;
  invoice?: string | null;
  role?: string | null;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type OpenAIChatInput = {
  message: string;
  context?: ChatAppContext;
  history?: ChatHistoryItem[];
};

export type OpenAIChatResult = {
  content: string;
};

const CONNECTION_ERROR =
  "I'm having trouble connecting to the AI service right now. Please try again in a moment.";

function buildContextBlock(context?: ChatAppContext): string {
  if (!context) return "No additional UI context was provided.";

  const lines = [
    context.page ? `Current page: ${context.page}` : null,
    context.pathname ? `Current path: ${context.pathname}` : null,
    context.role ? `User role: ${context.role}` : null,
    context.client ? `Current client: ${context.client}` : null,
    context.contract ? `Current contract: ${context.contract}` : null,
    context.campaign ? `Current campaign: ${context.campaign}` : null,
    context.invoice ? `Current invoice: ${context.invoice}` : null,
  ].filter(Boolean);

  return lines.length
    ? lines.join("\n")
    : "No additional UI context was provided.";
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new OpenAI({
    apiKey,
    timeout: 30_000,
    maxRetries: 1,
  });
}

/**
 * Calls OpenAI Chat Completions and returns the assistant text only.
 */
export async function generateChatCompletion(
  input: OpenAIChatInput,
): Promise<OpenAIChatResult> {
  const openai = getClient();

  const history = (input.history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    {
      role: "system",
      content: `Live application context for this request:\n${buildContextBlock(input.context)}`,
    },
    ...history,
    { role: "user", content: input.message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 700,
      messages,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return {
        content:
          "I couldn't generate a response. Please try again, or contact support if this keeps happening.",
      };
    }

    return { content };
  } catch (err) {
    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      throw err;
    }
    console.error("[openaiService] Chat completion failed:", err);
    const e = new Error(CONNECTION_ERROR);
    e.name = "OpenAIConnectionError";
    throw e;
  }
}

export { CONNECTION_ERROR };
