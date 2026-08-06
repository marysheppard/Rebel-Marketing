"use client";

import Link from "next/link";
import type { ChatAction, ChatMessage } from "@/components/AIChat/types";

function isExternalHref(href: string) {
  return (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("http://") ||
    href.startsWith("https://")
  );
}

/** Lightweight Markdown renderer (bold, italic, code, fences, lists, links). */
function renderMarkdown(content: string) {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return blocks.map((block, blockIndex) => {
    if (block.startsWith("```") && block.endsWith("```")) {
      const inner = block.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/```$/, "");
      return (
        <pre
          key={`code-${blockIndex}`}
          className="my-2 overflow-x-auto rounded-lg bg-base-200 p-3 text-xs leading-relaxed"
        >
          <code>{inner}</code>
        </pre>
      );
    }

    const lines = block.split("\n");
    return (
      <div key={`text-${blockIndex}`} className="space-y-1">
        {lines.map((line, lineIndex) => {
          const bullet = line.match(/^[-*]\s+(.*)$/);
          const ordered = line.match(/^\d+\.\s+(.*)$/);
          const body = bullet?.[1] ?? ordered?.[1] ?? line;

          const nodes = body.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g).filter(Boolean).map((part, i) => {
            if (part.startsWith("`") && part.endsWith("`")) {
              return (
                <code
                  key={i}
                  className="rounded bg-base-200 px-1 py-0.5 text-[0.85em]"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("*") && part.endsWith("*")) {
              return <em key={i}>{part.slice(1, -1)}</em>;
            }
            const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (link) {
              const href = link[2];
              if (isExternalHref(href) || href.startsWith("/")) {
                return (
                  <a
                    key={i}
                    href={href}
                    className="link link-primary"
                    {...(isExternalHref(href)
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {link[1]}
                  </a>
                );
              }
            }
            return <span key={i}>{part}</span>;
          });

          if (!line && lineIndex < lines.length - 1) {
            return <div key={lineIndex} className="h-2" />;
          }

          if (bullet) {
            return (
              <div key={lineIndex} className="flex gap-2">
                <span className="opacity-50">•</span>
                <span>{nodes}</span>
              </div>
            );
          }
          if (ordered) {
            return (
              <div key={lineIndex} className="flex gap-2">
                <span className="opacity-50">{line.match(/^(\d+)\./)?.[1]}.</span>
                <span>{nodes}</span>
              </div>
            );
          }
          return (
            <div key={lineIndex} className="min-h-[1.15em]">
              {nodes}
            </div>
          );
        })}
      </div>
    );
  });
}

export function MessageBubble({
  message,
  onNavigate,
  onRetry,
}: {
  message: ChatMessage;
  onNavigate?: (href: string) => void;
  onRetry?: (originalUserMessage: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-primary text-primary-content"
            : message.failed
              ? "rounded-bl-md border border-error/40 bg-error/5 text-base-content"
              : "rounded-bl-md border border-base-300 bg-base-100 text-base-content"
        }`}
      >
        <div className={isUser ? "whitespace-pre-wrap" : undefined}>
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>
        {!!message.actions?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action: ChatAction) =>
              isExternalHref(action.href) ? (
                <a
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className="btn btn-outline btn-xs border-base-300"
                >
                  {action.label}
                </a>
              ) : (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className="btn btn-outline btn-xs border-base-300"
                  onClick={() => onNavigate?.(action.href)}
                >
                  {action.label}
                </Link>
              ),
            )}
          </div>
        )}
        {message.failed && message.retryOf && onRetry && (
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => onRetry(message.retryOf!)}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
