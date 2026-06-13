import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stage 3",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
