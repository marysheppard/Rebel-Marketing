"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SUPPORT_CONTACT } from "@/data/supportContact";

type ContactInquiryButtonProps = {
  label: string;
  className?: string;
};

export function ContactInquiryButton({
  label,
  className,
}: ContactInquiryButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
    // Reset success after close animation settles
    window.setTimeout(() => {
      setSubmitted(false);
      setLoading(false);
    }, 200);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setError("Please fill in your name, email, and a short message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    // Demo flow: brief delay so submit feels intentional (no real email send).
    await new Promise((r) => setTimeout(r, 650));
    if (process.env.NODE_ENV === "development") {
      console.info("[contact inquiry]", { name, email, company, message });
    }
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open ? (
        <dialog className="modal modal-open" aria-labelledby={titleId}>
          <div className="modal-box max-w-lg bg-white text-[#0b1f3a] shadow-xl">
            {submitted ? (
              <div className="py-2 text-center sm:py-4">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0b1f3a]/10"
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-[#0b1f3a]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3
                  id={titleId}
                  className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold"
                >
                  Message sent
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/85">
                  Thanks for reaching out. Our team typically replies within one
                  business day.
                </p>
                <button
                  type="button"
                  className="btn mt-6 border-none bg-[#0b1f3a] font-semibold text-white hover:bg-[#143255]"
                  onClick={close}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3
                  id={titleId}
                  className="font-[family-name:var(--font-display)] text-xl font-bold"
                >
                  Email the team
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/85">
                  Tell us about your brand and goals. We’ll follow up shortly —
                  or reach us directly at{" "}
                  <a
                    href={SUPPORT_CONTACT.emailHref}
                    className="font-semibold underline"
                  >
                    {SUPPORT_CONTACT.email}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={SUPPORT_CONTACT.phoneHref}
                    className="font-semibold underline"
                  >
                    {SUPPORT_CONTACT.phone}
                  </a>
                  .
                </p>

                <form onSubmit={onSubmit} className="mt-5 grid gap-3">
                  {error ? (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <label className="grid gap-1">
                    <span className="text-sm font-medium">Name *</span>
                    <input
                      ref={nameRef}
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className="input input-bordered w-full border-[#0b1f3a]/20 bg-white"
                      placeholder="Mary Kate Sheppard"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium">Work email *</span>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="input input-bordered w-full border-[#0b1f3a]/20 bg-white"
                      placeholder="alex@brand.com"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium">Company</span>
                    <input
                      name="company"
                      type="text"
                      autoComplete="organization"
                      className="input input-bordered w-full border-[#0b1f3a]/20 bg-white"
                      placeholder="Brand Co."
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium">How can we help? *</span>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      className="textarea textarea-bordered w-full border-[#0b1f3a]/20 bg-white"
                      placeholder="Campaign goals, timeline, or anything we should know…"
                    />
                  </label>

                  <div className="modal-action mt-2">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={close}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn border-none bg-[#0b1f3a] font-semibold text-white hover:bg-[#143255]"
                      disabled={loading}
                    >
                      {loading ? "Sending…" : "Send message"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Close dialog" onClick={close}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
