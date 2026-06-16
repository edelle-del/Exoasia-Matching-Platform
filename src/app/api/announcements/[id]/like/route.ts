import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: announcement_id } = resolvedParams;

    if (!announcement_id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
    }

    const user_id = session.user.id;

    // Check if like exists
    const { data: existingLike } = await supabase
      .from("announcement_likes")
      .select("*")
      .eq("announcement_id", announcement_id)
      .eq("user_id", user_id)
      .single();

    if (existingLike) {
      // Already liked, just return success
      return NextResponse.json({ success: true, liked: true }, { status: 200 });
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("announcement_likes")
        .insert({ announcement_id, user_id });

      if (insertError) {
        console.error("Error inserting like:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, liked: true }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
