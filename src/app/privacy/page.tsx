import Link from "next/link";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { RebelLogo } from "@/components/RebelLogo";
import { SUPPORT_CONTACT } from "@/data/supportContact";

export default function PrivacyPage() {
  return (
    <div className="public-site min-h-screen bg-[#f4f7fb] text-[#0b1f3a]">
      <PublicSiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1e3a5f]/55">
          Legal
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[#1e3a5f]/75">
          Demo placeholder · Last updated August 5, 2026
        </p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-[#1e3a5f]/90">
          <p>
            Rebel Marketing (“we,” “us”) respects your privacy. This demo page
            explains how a production site would typically handle information
            collected through our marketing site and client portal.
          </p>
          <p>
            We may collect contact details you submit (name, email, company,
            phone), usage data from signed-in portal sessions, and basic
            analytics needed to improve the product experience.
          </p>
          <p>
            We do not sell personal information. Access is limited to team
            members and processors who need it to deliver services. For demo
            environments, sample data is fictional and not tied to real
            individuals unless you create an account.
          </p>
          <p>
            Questions? Email{" "}
            <a
              href={SUPPORT_CONTACT.emailHref}
              className="font-semibold text-[#0b1f3a] underline"
            >
              {SUPPORT_CONTACT.email}
            </a>
            .
          </p>
        </div>
        <Link
          href="/"
          className="mt-12 inline-block text-sm font-semibold text-[#0b1f3a] underline"
        >
          ← Back to home
        </Link>
      </main>
      <footer className="border-t border-[#0b1f3a12] bg-white py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <RebelLogo className="h-8 w-auto" />
          <p className="text-xs text-[#1e3a5f]/65">Oxford, Mississippi</p>
        </div>
      </footer>
    </div>
  );
}
