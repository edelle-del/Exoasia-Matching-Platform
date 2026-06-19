import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

async function checkPermissions(session: any) {
  const role = getRoleFromAccessToken(session.access_token);
  if (role === "admin" || role === "advisor") return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await adminClient
    .from("profiles")
    .select("member_role")
    .eq("id", session.user.id)
    .single();

  return profile?.member_role === "ecosystem_partner";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermissions(session);
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    const { error } = await adminClient
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting announcement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermissions(session);
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
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
      .update({
        title,
        content,
        is_featured: !!is_featured,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating announcement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ announcement: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
