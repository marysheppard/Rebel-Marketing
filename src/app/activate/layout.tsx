import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activate dashboard | Rebel Marketing",
  description: "Activate your Rebel Marketing client dashboard with a one-time code.",
};

export default function ActivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100 text-base-content">
      {children}
    </div>
  );
}
