"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";

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
        setMemberRole(null);
        setMemberRoleLoaded(true);
        setIsLoading(false);
        return;
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within Providers");
  }
  return context;
}
