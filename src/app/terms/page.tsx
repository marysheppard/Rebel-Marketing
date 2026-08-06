import Link from "next/link";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { RebelLogo } from "@/components/RebelLogo";
import { SUPPORT_CONTACT } from "@/data/supportContact";

export default function TermsPage() {
  return (
    <div className="public-site min-h-screen bg-[#f4f7fb] text-[#0b1f3a]">
      <PublicSiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1e3a5f]/55">
          Legal
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Terms of Use
        </h1>
        <p className="mt-3 text-sm text-[#1e3a5f]/75">
          Demo placeholder · Last updated August 5, 2026
        </p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-[#1e3a5f]/90">
          <p>
            By using the Rebel Marketing website and demo portal, you agree to
            these placeholder terms. This content is for product demonstration
            only and is not a binding legal agreement.
          </p>
          <p>
            Client logos, testimonials, and industry examples on the homepage
            are fictional samples created for demo purposes. They do not
            represent real engagements unless separately confirmed in writing.
          </p>
          <p>
            Portal access is limited to authorized users. You are responsible
            for keeping login credentials secure and for activity under your
            account.
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
