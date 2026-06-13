import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match Queue",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
