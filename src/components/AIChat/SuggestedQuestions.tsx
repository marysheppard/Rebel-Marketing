"use client";

const DEFAULT_QUESTIONS = [
  "How do I create a contract?",
  "How do invoices work?",
  "What is a retainer?",
  "Where can I view campaign expenses?",
  "How do I calculate profitability?",
  "Show me active projects.",
  "What does this page do?",
  "How do I log project hours?",
];

export function SuggestedQuestions({
  questions = DEFAULT_QUESTIONS,
  onSelect,
}: {
  questions?: string[];
  onSelect: (question: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">
        Suggested questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            className="btn btn-ghost btn-xs h-auto min-h-0 rounded-full border border-base-300 px-2.5 py-1.5 text-left font-normal normal-case"
            onClick={() => onSelect(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export { DEFAULT_QUESTIONS };
