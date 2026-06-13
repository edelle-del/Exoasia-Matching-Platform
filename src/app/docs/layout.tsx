import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | FOUNDERS ARENA",
  description:
    "Everything you need to use FOUNDERS ARENA — guides for startups, investors, and ecosystem partners.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
