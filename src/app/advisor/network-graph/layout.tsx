import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Network Graph",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
