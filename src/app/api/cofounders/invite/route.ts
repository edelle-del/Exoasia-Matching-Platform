import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid_type, uid_value } = (await request.json()) as {
      uid_type: "email" | "phone";
      uid_value: string;
    };

    if (!uid_type || !["email", "phone"].includes(uid_type)) {
      return NextResponse.json({ error: "uid_type must be email or phone" }, { status: 400 });
    }
    if (!uid_value?.trim()) {
      return NextResponse.json({ error: "uid_value is required" }, { status: 400 });
    }

    if (uid_type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(uid_value.trim())) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
    }

    // Prevent duplicate pending invite to the same UID
    const { data: existing } = await supabase
      .from("cofounder_invites")
      .select("id")
      .eq("inviter_id", user.id)
      .eq("uid_type", uid_type)
      .eq("uid_value", uid_value.trim())
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json({ error: "A pending invite for this contact already exists" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("cofounder_invites")
      .insert({
        inviter_id: user.id,
        uid_type,
        uid_value: uid_value.trim(),
      })
      .select("id, token, uid_type, uid_value, status, created_at, expires_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ invite: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invite_id } = (await request.json()) as { invite_id: string };
    if (!invite_id) {
      return NextResponse.json({ error: "invite_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("cofounder_invites")
      .update({ status: "expired" })
      .eq("id", invite_id)
      .eq("inviter_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
