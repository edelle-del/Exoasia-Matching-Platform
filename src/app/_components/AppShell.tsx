"use client";

import { usePathname } from "next/navigation";
import TopHeader from "./TopHeader";

const NO_SIDEBAR_PATHS = ["/", "/sign-in", "/sign-up", "/accept-invite", "/get-invited", "/not-authorized", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noSidebar = NO_SIDEBAR_PATHS.includes(pathname);

  if (noSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <TopHeader />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden pl-14">{children}</div>
    </div>
  );
}
