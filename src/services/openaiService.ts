/**
 * Server-only OpenAI integration for the Rebel help assistant.
 * Temporarily stubbed so production builds succeed without the `openai` package.
 * Restore the real OpenAI client when the AI bot is re-enabled.
 */

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

const STUB_UNAVAILABLE =
  "The AI help assistant is temporarily unavailable. Please try again later, or contact Rebel Marketing support.";

/**
 * Stubbed chat completion — does not call OpenAI.
 * Keeps types/exports for chatController and future re-enable.
 */
export async function generateChatCompletion(
  _input: OpenAIChatInput,
): Promise<OpenAIChatResult> {
  return { content: STUB_UNAVAILABLE };
}

export { CONNECTION_ERROR };
