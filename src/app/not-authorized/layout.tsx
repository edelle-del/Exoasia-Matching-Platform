import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Authorized",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
