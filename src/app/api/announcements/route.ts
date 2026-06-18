import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { checkWeeklyQuota, incrementWeeklyQuota } from "@/lib/quotas";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appRole = getRoleFromAccessToken(session.access_token);
    let isEcosystemPartner = false;

    if (appRole !== "admin" && appRole !== "advisor") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey);

      const { data: profile } = await adminClient
        .from("profiles")
        .select("member_role")
        .eq("id", session.user.id)
        .single();

      if (profile?.member_role !== "ecosystem_partner") {
        return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
      }

      isEcosystemPartner = true;

      const { remaining, isPaid } = await checkWeeklyQuota(session.user.id, "post_announcement");
      if (remaining === 0 && !isPaid) {
        return NextResponse.json({ error: "Weekly announcement quota exceeded." }, { status: 403 });
      }
    }

    const { title, content, is_featured } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await adminClient
      .from("announcements")
      .insert({
        author_id: session.user.id,
        title,
        content,
        is_featured: !!is_featured,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating announcement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isEcosystemPartner) {
      await incrementWeeklyQuota(session.user.id, "post_announcement");
    }

    return NextResponse.json({ announcement: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
