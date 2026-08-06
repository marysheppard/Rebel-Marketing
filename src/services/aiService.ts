import { createClient } from "@/lib/supabase/client";
import type {
  AIProvider,
  AssistantRequest,
  AssistantResponse,
  ChatAction,
} from "@/components/AIChat/types";
import type { UserRole } from "@/lib/types";
import {
  findFaq,
  findTerm,
  findWorkflow,
  formatSteps,
  getPageByPath,
} from "@/services/knowledgeBase";
import {
  describePage,
  filterActionsForRole,
  getSmartSuggestions,
} from "@/services/navigationService";
import {
  SUPPORT_CONTACT,
  supportFallbackMessage,
} from "@/data/supportContact";

const UNKNOWN = supportFallbackMessage();

function supportActions(): ChatAction[] {
  return [
    { label: `Email ${SUPPORT_CONTACT.email}`, href: SUPPORT_CONTACT.emailHref },
  ];
}

function withRole(
  actions: ChatAction[] | undefined,
  role?: UserRole,
): ChatAction[] | undefined {
  if (!actions?.length) return actions;
  if (!role) return actions;
  return filterActionsForRole(actions, role);
}

function wantsPageHelp(message: string): boolean {
  const q = message.toLowerCase();
  return (
    /what does this page/.test(q) ||
    /what is this page/.test(q) ||
    /explain this page/.test(q) ||
    /where am i/.test(q) ||
    /current page/.test(q)
  );
}

function wantsSuggestions(message: string): boolean {
  const q = message.toLowerCase();
  return (
    /what can i do/.test(q) ||
    /suggest/.test(q) ||
    /quick actions/.test(q) ||
    /help me here/.test(q)
  );
}

function parseClientSearch(message: string): string | null {
  const patterns = [
    /find\s+(?:client\s+)?(.+)$/i,
    /search\s+(?:for\s+)?(?:client\s+)?(.+)$/i,
    /look\s+up\s+(?:client\s+)?(.+)$/i,
    /open\s+client\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = message.trim().match(re);
    if (m?.[1]) {
      const term = m[1].replace(/[?.!]+$/, "").trim();
      if (term.length >= 2) return term;
    }
  }
  return null;
}

function parseInvoiceSearch(message: string): string | null {
  const m = message
    .trim()
    .match(/(?:open|find|show|go to)\s+invoice\s+#?([A-Za-z0-9-]+)/i);
  return m?.[1] ? m[1].trim() : null;
}

async function searchClients(term: string): Promise<AssistantResponse> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, client_name, status, industry")
      .ilike("client_name", `%${term}%`)
      .order("client_name")
      .limit(8);

    if (error) throw error;
    if (!data?.length) {
      return {
        content: `No clients matched “${term}”. Try a shorter name, or open Clients to browse the full list.`,
        actions: [{ label: "Open Clients", href: "/app/clients" }],
        source: "search",
      };
    }

    const lines = data.map(
      (c, i) =>
        `${i + 1}. **${c.client_name}** (${c.status}) — ${c.industry || "n/a"}`,
    );
    const actions: ChatAction[] = data.slice(0, 4).map((c) => ({
      label: c.client_name,
      href: `/app/clients/${c.id}`,
    }));
    actions.push({ label: "All Clients", href: "/app/clients" });

    return {
      content: `Here’s what I found for “${term}”:\n\n${lines.join("\n")}\n\nUse a button below to open a client.`,
      actions,
      source: "search",
    };
  } catch {
    return {
      content:
        "I couldn’t search clients right now. Open Clients to browse manually.",
      actions: [{ label: "Open Clients", href: "/app/clients" }],
      source: "search",
    };
  }
}

async function searchInvoice(number: string): Promise<AssistantResponse> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total_amount, clients(client_name)")
      .ilike("invoice_number", `%${number}%`)
      .limit(5);

    if (error) throw error;
    if (!data?.length) {
      return {
        content: `I couldn’t find invoice “${number}”. Check Billing or Accounts Receivable.`,
        actions: [
          { label: "Billing", href: "/app/billing" },
          { label: "Accounts Receivable", href: "/app/ar" },
        ],
        source: "search",
      };
    }

    const lines = data.map((inv) => {
      const clientName =
        inv.clients && !Array.isArray(inv.clients)
          ? (inv.clients as { client_name: string }).client_name
          : "Client";
      return `• **${inv.invoice_number}** — ${clientName} — ${inv.status} — $${Number(inv.total_amount).toLocaleString()}`;
    });

    return {
      content: `Matching invoice(s):\n\n${lines.join("\n")}`,
      actions: [
        { label: "Open Billing", href: "/app/billing" },
        { label: "Accounts Receivable", href: "/app/ar" },
      ],
      source: "search",
    };
  } catch {
    return {
      content: "I couldn’t look up that invoice right now. Try Billing or AR.",
      actions: [
        { label: "Billing", href: "/app/billing" },
        { label: "Accounts Receivable", href: "/app/ar" },
      ],
      source: "search",
    };
  }
}

export class MockAIProvider implements AIProvider {
  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const message = request.message.trim();
    const role = request.role;
    const pathname = request.context.pathname ?? "/app";
    if (!message) {
      return {
        content: UNKNOWN,
        actions: supportActions(),
        source: "fallback",
      };
    }

    await new Promise((r) => setTimeout(r, 280));

    const invoiceQ = parseInvoiceSearch(message);
    if (invoiceQ) {
      const res = await searchInvoice(invoiceQ);
      return { ...res, actions: withRole(res.actions, role) };
    }

    const clientQ = parseClientSearch(message);
    if (clientQ) {
      const res = await searchClients(clientQ);
      return { ...res, actions: withRole(res.actions, role) };
    }

    if (wantsPageHelp(message)) {
      const page = getPageByPath(pathname);
      if (page) {
        const entityNote =
          request.context.entityType && request.context.entityId
            ? `\n\nContext: you’re viewing a ${request.context.entityType} record.`
            : "";
        return {
          content: describePage(page) + entityNote,
          actions: withRole(
            [
              { label: `Go to ${page.title}`, href: page.path },
              ...getSmartSuggestions(pathname, role).slice(0, 2),
            ],
            role,
          ),
          source: "page",
        };
      }
    }

    if (wantsSuggestions(message)) {
      return {
        content:
          "Here are useful next steps for this screen. Click a button to jump there:",
        actions: getSmartSuggestions(pathname, role),
        source: "suggestion",
      };
    }

    const workflow = findWorkflow(message);
    if (workflow) {
      return {
        content: `${workflow.title}\n\n${formatSteps(workflow.steps)}`,
        actions: withRole(
          [{ label: "Take me there", href: workflow.path }],
          role,
        ),
        source: "workflow",
      };
    }

    const term = findTerm(message);
    if (term) {
      return {
        content: `**${term.term}**: ${term.definition}`,
        actions: getSmartSuggestions(pathname, role).slice(0, 2),
        source: "term",
      };
    }

    const faq = findFaq(message);
    if (faq) {
      return {
        content: faq.answer,
        actions: getSmartSuggestions(pathname, role).slice(0, 2),
        source: "faq",
      };
    }

    return {
      content: UNKNOWN,
      actions: [
        ...supportActions(),
        ...(withRole([{ label: "Dashboard", href: "/app" }], role) ?? []),
      ],
      source: "fallback",
    };
  }
}

export function createAIProvider(): AIProvider {
  return new MockAIProvider();
}

export async function askAssistant(
  request: AssistantRequest,
): Promise<AssistantResponse> {
  return createAIProvider().respond(request);
}
