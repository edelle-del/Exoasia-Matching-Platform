import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import AppShell from "./_components/AppShell";
import AuthGate from "./_components/AuthGate";

const inter = Inter({
  variable: "--font-cereal",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Founder's Arena Matching Platform",
  description: "Where Philippine startups meet the capital that scales them.",
  icons: {
    icon: "/logo.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-sans" suppressHydrationWarning>
        <Providers>
          <AppShell>
            <AuthGate>
              <main>{children}</main>
            </AuthGate>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
