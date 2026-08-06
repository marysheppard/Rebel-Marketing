import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rebel Marketing | Strategy, Campaigns & Growth",
  description:
    "Rebel Marketing is a growth-focused agency based in Oxford, Mississippi—brand campaigns, client partnerships, and measurable results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="corporate"
      className={`${display.variable} ${body.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-base-100 text-base-content antialiased">
        {children}
      </body>
    </html>
  );
}
