import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign agreement | Rebel Marketing",
  description: "Secure contract signing access for a single signature request.",
};

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100 text-base-content">
      {children}
    </div>
  );
}
