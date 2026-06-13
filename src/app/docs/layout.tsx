import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | Founders Arena",
  description:
    "Everything you need to use Founders Arena — guides for startups, investors, and ecosystem partners.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
