"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "../providers";
import TopHeader from "./TopHeader";
import AnnouncementModal from "@/components/AnnouncementModal";

const NO_SIDEBAR_PATHS = ["/", "/sign-in", "/sign-up", "/accept-invite", "/get-invited", "/not-authorized", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signedIn } = useAuth();

  let noSidebar = NO_SIDEBAR_PATHS.includes(pathname);
  if (pathname === "/docs" && !signedIn) {
    noSidebar = true;
  }

  if (noSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AnnouncementModal />
      <TopHeader />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden pt-14 md:pt-0 md:pl-56">{children}</div>
    </div>
  );
}
