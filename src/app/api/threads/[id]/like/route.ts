import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = adminClient();

  const { data: existing } = await admin
    .from("thread_likes")
    .select("id")
    .eq("thread_id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing) {
    await admin.from("thread_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  }

  await admin.from("thread_likes").insert({ thread_id: id, user_id: session.user.id });
  return NextResponse.json({ liked: true });
}
