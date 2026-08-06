/**
 * Canonical Rebel Marketing team roster — homepage "Our team" and staff profiles.
 */
export type TeamMember = {
  name: string;
  title: string;
  department: string;
  /** Public / demo work email shown in the app */
  email: string;
};

export const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    name: "HP Hazelwood",
    title: "Creative Director",
    department: "Creative",
    email: "hp.hazelwood@rebelmarketing.demo",
  },
  {
    name: "Hunter Thomas",
    title: "Account Manager",
    department: "Account Management",
    email: "hunter.thomas@rebelmarketing.demo",
  },
  {
    name: "Jackson Thomas",
    title: "Brand Strategist",
    department: "Strategy",
    email: "jackson.thomas@rebelmarketing.demo",
  },
  {
    name: "Joshua Harvel",
    title: "Paid Media Lead",
    department: "Media",
    email: "joshua.harvel@rebelmarketing.demo",
  },
  {
    name: "Mary Kate Sheppard",
    title: "Managing Partner",
    department: "Leadership",
    email: "marykate.sheppard@rebelmarketing.demo",
  },
  {
    name: "McKane Everett",
    title: "Content Lead",
    department: "Content",
    email: "mckane.everett@rebelmarketing.demo",
  },
  {
    name: "Sydney Himmelbaum",
    title: "Social Media Manager",
    department: "Social",
    email: "sydney.himmelbaum@rebelmarketing.demo",
  },
  {
    name: "Will Watson",
    title: "Analytics Lead",
    department: "Analytics",
    email: "will.watson@rebelmarketing.demo",
  },
] as const;
