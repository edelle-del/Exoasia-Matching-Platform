import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import {
  canAccessPath,
  getHomePathForRole,
  isPublicPath,
} from "@/lib/auth/access";
const ADMIN_PATH_PREFIXES = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseKey,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    },
  );

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = new URL("/sign-in", origin);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const role = getRoleFromAccessToken(session?.access_token);

    if (!canAccessPath(pathname, role)) {
      const redirectUrl = new URL(getHomePathForRole(role), origin);
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }

    if (
      ADMIN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
      role !== "admin"
    ) {
      const redirectUrl = new URL("/not-authorized", origin);
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }

    // Block members from accessing the app until onboarding is complete
    const isOnboardingPath = pathname === "/onboarding";
    const isMemberRole = !role || !["advisor", "admin", "staff"].includes(role);
    if (!isOnboardingPath && isMemberRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, sector, stage")
        .eq("id", user.id)
        .single();

      // Bypass onboarding for admins and advisors
      if (role === "admin" || role === "advisor") {
        return response;
      }

      // Stage 4 = Guide/Advisor — bypass onboarding regardless of JWT role claim.
      // This handles cases where the custom_access_token_hook is not yet enabled.
      if (profile?.stage === "4") {
        return response;
      }

      const needsOnboarding = !profile?.full_name || !profile?.sector;
      if (needsOnboarding) {
        const redirectUrl = new URL("/onboarding", origin);
        redirectUrl.search = request.nextUrl.search;
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
