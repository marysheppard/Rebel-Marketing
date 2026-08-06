import Link from "next/link";
import { ContactInquiryButton } from "@/components/ContactInquiryModal";
import { PublicFaqChat } from "@/components/PublicFaqChat";
import { PublicRolePreview } from "@/components/PublicRolePreview";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { RebelLogo } from "@/components/RebelLogo";
import { SUPPORT_CONTACT } from "@/data/supportContact";

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
              <RebelLogo className="h-14 w-auto sm:h-20" variant="onDark" />
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

        <section
          id="clients"
          aria-label="Trusted by"
          className="border-t border-[#0b1f3a10] bg-[#eef3f9] py-12 sm:py-14"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#1e3a5f]/55">
              Trusted by growth-minded brands
            </p>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:gap-x-14">
              {[
                "Northfield Outfitters",
                "Magnolia Hospitality",
                "Delta Civic Bank",
                "Harbor & Co.",
                "Lumen Fieldhouse",
                "Cedar & Stone Realty",
              ].map((name) => (
                <li
                  key={name}
                  className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-[#0b1f3a]/45 sm:text-base"
                >
                  {name}
                </li>
              ))}
            </ul>
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
          id="industries"
          className="border-t border-[#0b1f3a10] bg-white py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Who we serve
            </h2>
            <p className="mt-3 max-w-xl text-[#1e3a5f]/90">
              Brands with a real audience and a real P&amp;L—especially across
              the Southeast and campus-adjacent markets like Oxford.
            </p>
            <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Local retail & e‑comm",
                  body: "Storefronts and DTC brands that need campaigns tied to traffic, basket size, and repeat purchase.",
                },
                {
                  title: "Hospitality & tourism",
                  body: "Hotels, venues, and destination brands competing for weekends, events, and shoulder-season stays.",
                },
                {
                  title: "Professional services",
                  body: "Banks, clinics, and advisors who win on trust—and need clear, compliant marketing systems.",
                },
                {
                  title: "Higher ed & nonprofits",
                  body: "Schools, foundations, and civic orgs that need enrollment, donations, and community reach.",
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
          id="about"
          className="border-t border-[#0b1f3a10] bg-white py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              About Us
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#1e3a5f]/90 sm:text-lg">
              Rebel Marketing is a compact agency based in Oxford, Mississippi,
              built for brands that want sharper campaigns and clearer
              accountability. We combine strategy, creative, and client
              partnership under one roof—so the work stays ambitious and the
              process stays honest.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#1e3a5f]/80">
              We are not a freelance marketplace or a software vendor with a
              logo slapped on. We are the team in the room with you—from the
              first scope to the last invoice.
            </p>
            <ul className="mt-12 grid gap-10 sm:grid-cols-3">
              {[
                {
                  title: "Strategy",
                  body: "Account and planning leads who translate goals into scopes, timelines, and channel choices you can defend.",
                },
                {
                  title: "Creative",
                  body: "Marketing specialists who ship campaigns, content, and brand work that holds up across channels.",
                },
                {
                  title: "Partnership",
                  body: "A client-facing rhythm of approvals, updates, and portals so you always know what’s moving—and what’s next.",
                },
              ].map((item) => (
                <li key={item.title}>
                  <h3 className="text-lg font-bold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1e3a5f]/88">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
            <h3 className="mt-14 text-xl font-bold tracking-tight text-[#0b1f3a]">
              Our team
            </h3>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "HP Hazelwood", role: "Creative Director" },
                { name: "Hunter Thomas", role: "Account Manager" },
                { name: "Jackson Thomas", role: "Brand Strategist" },
                { name: "Joshua Harvel", role: "Paid Media Lead" },
                { name: "Mary Kate Sheppard", role: "Managing Partner" },
                { name: "McKane Everett", role: "Content Lead" },
                { name: "Sydney Himmelbaum", role: "Social Media Manager" },
                { name: "Will Watson", role: "Analytics Lead" },
              ].map((member) => (
                <li
                  key={member.name}
                  className="rounded-xl border border-[#0b1f3a12] bg-[#f7f9fc] px-4 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b1f3a] text-xs font-bold text-white">
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <h4 className="mt-3 text-sm font-bold tracking-tight text-[#0b1f3a]">
                    {member.name}
                  </h4>
                  <p className="mt-1 text-xs font-medium text-[#1e3a5f]/75">
                    {member.role}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="testimonials"
          className="border-t border-[#0b1f3a10] bg-[#eef3f9] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              What partners say
            </h2>
            <p className="mt-3 max-w-xl text-[#1e3a5f]/90">
              Sample feedback from demo client partners—illustrative of how we
              work, not live case studies.
            </p>
            <ul className="mt-12 grid gap-10 lg:grid-cols-3">
              {[
                {
                  quote:
                    "Approvals finally live in one place. Our team stopped chasing decks in email and started shipping on time.",
                  name: "Jordan Hale",
                  role: "Marketing Director, Harbor & Co.",
                },
                {
                  quote:
                    "Rebel tied spend, creative, and reporting together. Leadership can see what’s working without a weekly scavenger hunt.",
                  name: "Priya Nair",
                  role: "VP Growth, Magnolia Hospitality",
                },
                {
                  quote:
                    "They scope like operators, not pitch artists. Contracts, campaigns, and invoices actually match the work we asked for.",
                  name: "Marcus Bell",
                  role: "CEO, Northfield Outfitters",
                },
              ].map((item) => (
                <li key={item.name} className="border-l-2 border-[#0b1f3a] pl-5">
                  <blockquote className="text-base leading-relaxed text-[#0b1f3a]">
                    “{item.quote}”
                  </blockquote>
                  <p className="mt-4 text-sm font-bold tracking-tight text-[#0b1f3a]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#1e3a5f]/75">
                    {item.role}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="preview"
          className="border-t border-[#0b1f3a10] bg-white py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1e3a5f]/55">
              Interactive demo — sample data
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Your client portal at a glance
            </h2>
            <p className="mt-3 max-w-xl text-[#1e3a5f]/90">
              Preview how partners see campaigns, approvals, and invoices—then
              sign in to the real client workspace.
            </p>
            <PublicRolePreview />
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
              Based in Oxford, Mississippi. Tell us about your brand, your
              goals, and the work that needs a sharper edge. Our team will
              follow up shortly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ContactInquiryButton
                label="Email the team"
                className="btn border-none bg-white font-semibold text-[#0b1f3a] hover:bg-white/90"
              />
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

      <footer className="border-t border-[#0b1f3a12] bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <RebelLogo className="h-8 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#1e3a5f]/75">
              Oxford, Mississippi. Strategy, creative, and client partnerships
              you can measure.
            </p>
            <p className="mt-6 text-xs text-[#1e3a5f]/55">
              © {new Date().getFullYear()} Rebel Marketing. All rights reserved.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1e3a5f]/55">
              Contact
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-[#0b1f3a]">
              <li>
                <a
                  href={SUPPORT_CONTACT.emailHref}
                  className="font-medium hover:underline"
                >
                  {SUPPORT_CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={SUPPORT_CONTACT.phoneHref}
                  className="font-medium hover:underline"
                >
                  {SUPPORT_CONTACT.phone}
                </a>
              </li>
              <li className="text-[#1e3a5f]/75">
                {SUPPORT_CONTACT.address}
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#1e3a5f]/55">
              Connect
            </h3>
            <ul className="mt-4 space-y-2 text-sm font-medium text-[#0b1f3a]">
              <li>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <PublicFaqChat />
    </div>
  );
}
