import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import AppShell from "./_components/AppShell";
import AuthGate from "./_components/AuthGate";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Founders Arena Matching Platform",
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
      className={`${montserrat.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
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
