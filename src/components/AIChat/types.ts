/**
 * Shared types for the Rebel help assistant.
 */

import type { UserRole } from "@/lib/types";

export type ChatRole = "user" | "assistant" | "system";

export type ChatAction = {
  label: string;
  href: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  actions?: ChatAction[];
  failed?: boolean;
  retryOf?: string;
  createdAt: string;
};

export type AssistantPageContext = {
  page?: string | null;
  pathname?: string | null;
  client?: string | null;
  contract?: string | null;
  campaign?: string | null;
  invoice?: string | null;
  role?: UserRole | string | null;
  entityType?: "client" | "contract" | "campaign" | "invoice" | null;
  entityId?: string | null;
};

export type AssistantRequest = {
  message: string;
  context: AssistantPageContext;
  history?: ChatMessage[];
  role?: UserRole;
};

export type AssistantResponse = {
  content: string;
  actions?: ChatAction[];
  source?:
    | "workflow"
    | "faq"
    | "term"
    | "page"
    | "suggestion"
    | "search"
    | "fallback";
};

export type AIProvider = {
  respond: (request: AssistantRequest) => Promise<AssistantResponse>;
};
