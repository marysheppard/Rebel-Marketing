import knowledge from "@/data/knowledge.json";
import faq from "@/data/faq.json";

export type KnowledgePage = (typeof knowledge.pages)[number];
export type KnowledgeTerm = (typeof knowledge.terms)[number];
export type KnowledgeWorkflow = (typeof knowledge.workflows)[number];
export type FaqItem = (typeof faq.faqs)[number];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if `phrase` appears in `query` as a whole-word phrase (not inside another word). */
function containsPhrase(query: string, phrase: string): boolean {
  const q = normalize(query);
  const p = normalize(phrase);
  if (!q || !p) return false;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(p)}(?=\\s|$)`);
  return pattern.test(q);
}

function scoreKeywords(query: string, keywords: string[]): number {
  const q = normalize(query);
  let score = 0;
  for (const raw of keywords) {
    const k = normalize(raw);
    if (!k) continue;
    if (k.includes(" ")) {
      if (q.includes(k)) score += k.split(" ").length + 3;
    } else if (containsPhrase(q, k)) {
      score += 3;
    }
  }
  return score;
}

/** Find the best-matching workflow (how-to) for a user question. */
export function findWorkflow(query: string): KnowledgeWorkflow | null {
  let best: KnowledgeWorkflow | null = null;
  let bestScore = 0;
  for (const workflow of knowledge.workflows) {
    const score =
      scoreKeywords(query, workflow.keywords) +
      scoreKeywords(query, [workflow.title]);
    if (score > bestScore) {
      bestScore = score;
      best = workflow;
    }
  }
  return bestScore >= 6 ? best : null;
}

/** Search FAQ entries. */
export function findFaq(query: string): FaqItem | null {
  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const item of faq.faqs) {
    const score =
      scoreKeywords(query, item.keywords) +
      scoreKeywords(query, [item.question]);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 6 ? best : null;
}

/**
 * Glossary lookup — ONLY if the full term phrase appears in the question.
 * Never match on partial words (e.g. "project" inside "projects").
 */
export function findTerm(query: string): KnowledgeTerm | null {
  const q = normalize(query);
  if (!q) return null;

  let best: KnowledgeTerm | null = null;
  let bestScore = 0;

  for (const term of knowledge.terms) {
    const t = normalize(term.term);
    if (!t || t.length < 3) continue;
    // Multi-word terms must appear as the contiguous phrase
    if (t.includes(" ")) {
      if (!q.includes(t)) continue;
    } else if (!containsPhrase(q, t)) {
      continue;
    }

    const score = 20 + t.length;
    if (score > bestScore) {
      bestScore = score;
      best = term;
    }
  }

  return best;
}

/** Resolve knowledge for the current route. */
export function getPageByPath(pathname: string): KnowledgePage | null {
  const exact = knowledge.pages.find((p) => p.path === pathname);
  if (exact) return exact;
  const prefix = knowledge.pages
    .filter((p) => p.path !== "/app")
    .find((p) => pathname.startsWith(p.path + "/"));
  if (prefix) return prefix;
  if (pathname === "/app" || pathname.startsWith("/app?")) {
    return knowledge.pages.find((p) => p.id === "dashboard") ?? null;
  }
  return null;
}

export function getAllPages(): KnowledgePage[] {
  return knowledge.pages;
}

export function formatSteps(steps: string[]): string {
  return steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
}

export function normalizeText(text: string): string {
  return normalize(text);
}
