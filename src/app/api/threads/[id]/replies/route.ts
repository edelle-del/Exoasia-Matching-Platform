import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = adminClient();

  const { data: replies, error } = await admin
    .from("thread_replies")
    .select("id, body, created_at, author_id")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authorIds = [...new Set((replies ?? []).map((r) => r.author_id))];
  const { data: profiles } = authorIds.length > 0
    ? await admin.from("profiles").select("id, full_name, member_role").in("id", authorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const result = (replies ?? []).map((r) => ({
    ...r,
    author: profileMap.get(r.author_id) ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json() as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });
  if (body.trim().length > 1000) return NextResponse.json({ error: "Max 1000 characters." }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from("thread_replies")
    .insert({ thread_id: id, author_id: session.user.id, body: body.trim() })
    .select("id, body, created_at, author_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, member_role")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({ ...data, author: profile ?? null });
}
