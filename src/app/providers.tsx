"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { AlertTriangle } from "lucide-react";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  signedIn: boolean;
  isInvitedAccount: boolean;
  role: string | null;
  memberRole: string | null;
  stage: string | null;
  memberRoleLoaded: boolean;
  isLoading: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{
    error: string | null;
    session: Session | null;
    user: User | null;
  }>;
  signOut: () => Promise<void>;
  completeInviteClaim: (details: {
    name: string;
    password: string;
  }) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [memberRoleLoaded, setMemberRoleLoaded] = useState(false);
  const [sessionConflictError, setSessionConflictError] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfileData = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("member_role, stage")
        .eq("id", userId)
        .single();
      if (isMounted) {
        setMemberRole(data?.member_role ?? null);
        setStage(data?.stage ?? null);
        setMemberRoleLoaded(true);
      }
    };

    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        setSession(null);
        setUser(null);
        userIdRef.current = null;
        setMemberRole(null);
        setMemberRoleLoaded(true);
        setIsLoading(false);
        return;
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      userIdRef.current = data.session?.user?.id ?? null;
      if (data.session?.user) {
        await fetchProfileData(data.session.user.id);
      } else {
        setMemberRoleLoaded(true);
      }
      setIsLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const currentUserId = userIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;

      if (currentUserId && nextUserId && currentUserId !== nextUserId) {
        setSessionConflictError(true);
        setSession(null);
        setUser(null);
        setMemberRole(null);
        setStage(null);
        setMemberRoleLoaded(true);
        return;
      }

      userIdRef.current = nextUserId;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setMemberRoleLoaded(false);
        void fetchProfileData(nextSession.user.id);
      } else {
        setMemberRole(null);
        setStage(null);
        setMemberRoleLoaded(true);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      signedIn: !!user,
      isInvitedAccount: user?.user_metadata?.account_status === "invited",
      role: getRoleFromAccessToken(session?.access_token),
      memberRole,
      stage,
      memberRoleLoaded,
      isLoading,
      signInWithPassword: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return {
          error: error?.message ?? null,
          session: data.session ?? null,
          user: data.user ?? null,
        };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      },
      completeInviteClaim: async ({
        name,
        password,
      }: {
        name: string;
        password: string;
      }) => {
        const { error } = await supabase.auth.updateUser({
          password,
          data: {
            full_name: name,
            account_status: "active",
            invite_inviter_name: null,
            invite_project_name: null,
          },
        });

        return { error: error?.message ?? null };
      },
    }),
    [isLoading, memberRole, stage, memberRoleLoaded, session, supabase, user],
  );

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {sessionConflictError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-2xl flex flex-col gap-4 relative text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-(--color-ink)">Session Terminated</h2>
            <p className="text-sm text-(--color-body)">
              Another session was detected with a different account. For your security, this tab has been automatically logged out.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 w-full rounded-xl bg-(--color-ink) py-2.5 text-sm font-semibold text-(--color-canvas) hover:opacity-90 transition-opacity"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within Providers");
  }
  return context;
}
