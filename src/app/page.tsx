import Link from "next/link";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { RebelLogo } from "@/components/RebelLogo";

export default function HomePage() {
  return (
    <div className="public-site min-h-screen bg-[#f4f7fb] text-[#0b1f3a]">
      <PublicSiteHeader />

      <main>
        {/* Hero — brand-first, full-bleed atmosphere */}
        <section className="relative min-h-[calc(100vh-4.25rem)] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(125deg, #0b1f3a 0%, #143255 42%, #1e3a5f 72%, #2a4a6e 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div
            className="pointer-events-none absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, #4a7ab0 0%, transparent 70%)" }}
          />

          <div className="relative mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:py-20">
            <div className="public-hero-brand mb-8">
              <RebelLogo className="h-14 w-auto brightness-0 invert sm:h-20" />
            </div>
            <h1 className="public-hero-title max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              Marketing that moves the number that matters.
            </h1>
            <p className="public-hero-copy mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              Rebel Marketing partners with growth-minded brands on campaigns,
              creative, and client work you can measure from kickoff to cash.
            </p>
            <div className="public-hero-cta mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="btn border-none bg-white px-6 font-semibold text-[#0b1f3a] hover:bg-white/90"
              >
                Start a conversation
              </a>
              <Link
                href="/login?portal=client"
                className="btn border border-white/30 bg-transparent px-6 font-semibold text-white hover:bg-white/10"
              >
                Client portal
              </Link>
            </div>
          </div>
        </section>

        <section id="services" className="border-t border-[#0b1f3a10] bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              What we deliver
            </h2>
            <p className="mt-3 max-w-xl text-[#1e3a5f]/90">
              Strategy, creative, and execution under one roof—so your brand
              shows up clearly and your team stays aligned.
            </p>
            <ul className="mt-12 grid gap-10 sm:grid-cols-3">
              {[
                {
                  title: "Brand & campaigns",
                  body: "Positioning, integrated campaigns, and creative that holds up across channels.",
                },
                {
                  title: "Client partnerships",
                  body: "Dedicated account leadership, clear scopes, and approvals you can trust.",
                },
                {
                  title: "Performance clarity",
                  body: "Work, costs, and outcomes connected so leadership sees progress—not noise.",
                },
              ].map((item) => (
                <li key={item.title}>
                  <h3 className="text-lg font-bold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/88">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="approach"
          className="border-t border-[#0b1f3a10] bg-[#eef3f9] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              How we work
            </h2>
            <p className="mt-3 max-w-xl text-[#1e3a5f]/90">
              One operating rhythm from contract to campaign close—built for
              teams that value transparency.
            </p>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Scope with intent",
                  body: "Contracts and goals are explicit before the first creative brief.",
                },
                {
                  step: "02",
                  title: "Ship with accountability",
                  body: "Work logs, approvals, and budgets stay visible to the people who need them.",
                },
                {
                  step: "03",
                  title: "Close the loop",
                  body: "Billing and results stay tied to the work that created them.",
                },
              ].map((item) => (
                <li key={item.step}>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1e3a5f]/55">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/88">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="contact"
          className="border-t border-[#0b1f3a10] bg-[#0b1f3a] py-20 text-white sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Let’s build what comes next
            </h2>
            <p className="mt-3 max-w-lg text-white/75">
              Tell us about your brand, your goals, and the work that needs a
              sharper edge. Our team will follow up shortly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:hello@rebel.demo"
                className="btn border-none bg-white font-semibold text-[#0b1f3a] hover:bg-white/90"
              >
                Email the team
              </a>
              <Link
                href="/login?portal=admin"
                className="btn border border-white/30 bg-transparent font-semibold text-white hover:bg-white/10"
              >
                Admin login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0b1f3a12] bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <RebelLogo className="h-8 w-auto" />
          <p className="text-xs text-[#1e3a5f]/65">
            © {new Date().getFullYear()} Rebel Marketing. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
