import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stage 1",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
