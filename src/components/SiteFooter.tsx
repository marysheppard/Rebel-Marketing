import Link from "next/link";
import { RebelLogo } from "@/components/RebelLogo";
import { SUPPORT_CONTACT } from "@/data/supportContact";

export type FooterLink = { href: string; label: string };

const PUBLIC_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/#services", label: "Services" },
      { href: "/#approach", label: "Approach" },
      { href: "/#contact", label: "Contact" },
    ],
  },
  {
    title: "Access",
    links: [
      { href: "/login?portal=admin", label: "Admin login" },
      { href: "/login?portal=client", label: "Client portal" },
      { href: "/signup", label: "Sign up" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/#contact", label: "Contact the team" },
      { href: SUPPORT_CONTACT.emailHref, label: SUPPORT_CONTACT.email },
      { href: SUPPORT_CONTACT.phoneHref, label: SUPPORT_CONTACT.phone },
    ],
  },
];

type SiteFooterProps =
  | { variant: "public" }
  | {
      variant: "app";
      /** Role-filtered workspace links (usually from AppShell NAV). */
      links: FooterLink[];
    };

/**
 * Shared site footer for the public marketing site and the logged-in app shell.
 */
export function SiteFooter(props: SiteFooterProps) {
  const year = new Date().getFullYear();
  const isPublic = props.variant === "public";

  const columns = isPublic
    ? PUBLIC_COLUMNS
    : [
        {
          title: "Workspace",
          links: props.links,
        },
        {
          title: "Account",
          links: [
            { href: "/app", label: "Dashboard" },
            { href: "/", label: "Marketing site" },
            { href: "/login", label: "Switch login" },
          ],
        },
      ];

  return (
    <footer
      className={
        isPublic
          ? "border-t border-[#0b1f3a12] bg-white text-[#0b1f3a]"
          : "mt-auto border-t border-base-300 bg-base-200/60 text-base-content"
      }
    >
      <div
        className={
          isPublic
            ? "mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12"
            : "px-4 py-8 sm:px-6"
        }
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <Link
              href={isPublic ? "/" : "/app"}
              className="inline-block"
              aria-label="Rebel Marketing"
            >
              <RebelLogo className="h-8 w-auto" />
            </Link>
            <p
              className={`mt-3 text-sm leading-relaxed ${
                isPublic ? "text-[#1e3a5f]/75" : "opacity-70"
              }`}
            >
              {isPublic
                ? "Marketing that moves the number that matters — from contract to cash."
                : "Connected contract-to-cash workspace for Rebel Marketing."}
            </p>
          </div>

          <div
            className={`grid flex-1 gap-8 sm:grid-cols-2 ${
              isPublic ? "lg:max-w-2xl lg:grid-cols-3" : "lg:max-w-xl"
            }`}
          >
            {columns.map((col) => (
              <div key={col.title}>
                <h3
                  className={`text-xs font-bold uppercase tracking-[0.16em] ${
                    isPublic ? "text-[#1e3a5f]/55" : "opacity-50"
                  }`}
                >
                  {col.title}
                </h3>
                <ul
                  className={`mt-3 space-y-2 ${
                    !isPublic && col.title === "Workspace" && col.links.length > 6
                      ? "sm:columns-2 sm:gap-x-8 sm:space-y-0 [&>li]:sm:mb-2"
                      : ""
                  }`}
                >
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.href}-${link.label}`}>
                      {link.href.startsWith("mailto:") ||
                      link.href.startsWith("tel:") ? (
                        <a
                          href={link.href}
                          className={`text-sm font-medium transition ${
                            isPublic
                              ? "text-[#0b1f3a] hover:text-[#143255]"
                              : "hover:text-primary"
                          }`}
                        >
                          {link.label}
                        </a>
                      ) : link.href.startsWith("/#") || link.href.includes("#") ? (
                        <a
                          href={link.href}
                          className={`text-sm font-medium transition ${
                            isPublic
                              ? "text-[#0b1f3a] hover:text-[#143255]"
                              : "hover:text-primary"
                          }`}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className={`text-sm font-medium transition ${
                            isPublic
                              ? "text-[#0b1f3a] hover:text-[#143255]"
                              : "hover:text-primary"
                          }`}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between ${
            isPublic
              ? "border-[#0b1f3a12] text-[#1e3a5f]/65"
              : "border-base-300 opacity-60"
          }`}
        >
          <p>© {year} Rebel Marketing. All rights reserved.</p>
          <p>Contract engagement & contract-to-cash</p>
        </div>
      </div>
    </footer>
  );
}
