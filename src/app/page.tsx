"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { createClient } from "@/lib/supabase/client";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { getSignedInRedirectPath } from "@/lib/auth/access";

export default function Home() {
  const router = useRouter();
  const { signedIn, isInvitedAccount } = useAuth();

  useEffect(() => {
    if (!signedIn) {
      router.replace("/sign-in");
      return;
    }
    if (isInvitedAccount) { router.replace("/accept-invite"); return; }
    const redirect = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;
        const tokenRole = getRoleFromAccessToken(accessToken);
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) { router.replace("/dashboard"); return; }
        const { data: profile } = await supabase.from("profiles").select("id, full_name, sector").eq("id", userId).single();
        const needsOnboarding = !profile || !profile.full_name || !profile.sector;
        router.replace(getSignedInRedirectPath({ role: tokenRole, isInvitedAccount, needsOnboarding }));
      } catch { router.replace("/dashboard"); }
    };
    redirect();
  }, [signedIn, isInvitedAccount, router]);

  return null;
}
