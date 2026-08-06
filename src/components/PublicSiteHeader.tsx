"use client";

import Link from "next/link";
import { ChevronDown, LogIn } from "lucide-react";
import { RebelLogo } from "@/components/RebelLogo";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#0b1f3a12] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.25rem] sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Rebel Marketing home">
          <RebelLogo priority className="h-9 w-auto sm:h-11" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-[#1e3a5f] lg:flex xl:gap-8">
          <a href="#services" className="transition hover:text-[#0b1f3a]">
            Services
          </a>
          <a href="#industries" className="transition hover:text-[#0b1f3a]">
            Industries
          </a>
          <a href="#about" className="transition hover:text-[#0b1f3a]">
            About
          </a>
          <a href="#testimonials" className="transition hover:text-[#0b1f3a]">
            Stories
          </a>
          <a href="#preview" className="transition hover:text-[#0b1f3a]">
            Preview
          </a>
          <a href="#contact" className="transition hover:text-[#0b1f3a]">
            Contact
          </a>
        </nav>

        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn border-none bg-[#0b1f3a] px-4 text-white hover:bg-[#163054]"
          >
            <LogIn className="h-4 w-4" />
            Login
            <ChevronDown className="h-4 w-4 opacity-80" />
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content mt-2 w-56 rounded-xl border border-[#0b1f3a12] bg-white p-2 shadow-lg"
          >
            <li>
              <Link
                href="/login?portal=admin"
                className="rounded-lg py-2.5 text-sm font-semibold text-[#0b1f3a]"
              >
                Admin Login
              </Link>
            </li>
            <li>
              <Link
                href="/login?portal=client"
                className="rounded-lg py-2.5 text-sm font-semibold text-[#0b1f3a]"
              >
                Client Portal Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
