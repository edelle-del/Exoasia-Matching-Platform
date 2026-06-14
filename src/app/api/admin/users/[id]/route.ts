import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    const role = roleData?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Prevent admins from deleting themselves
    if (user?.id === id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    const role = roleData?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { full_name, business_name, member_role, stage, verification_status, account_status, app_role } = body;

    // 1. Update Profile Data
    const profileUpdates: any = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (business_name !== undefined) profileUpdates.business_name = business_name;
    if (member_role !== undefined) profileUpdates.member_role = member_role;
    if (stage !== undefined) profileUpdates.stage = stage;
    if (verification_status !== undefined) profileUpdates.verification_status = verification_status;
    if (account_status !== undefined) profileUpdates.account_status = account_status;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await admin.from("profiles").update(profileUpdates).eq("id", id);
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 2. Update Platform Role
    if (app_role !== undefined) {
      // Prevent admin from removing their own admin role to avoid locking themselves out
      if (user.id === id && app_role !== "admin") {
        return NextResponse.json({ error: "You cannot demote yourself." }, { status: 400 });
      }

      const { error: roleError } = await admin
        .from("user_roles")
        .update({ role: app_role })
        .eq("user_id", id);
      if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
