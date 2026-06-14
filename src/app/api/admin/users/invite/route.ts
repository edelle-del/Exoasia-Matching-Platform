import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    
    // Verify admin role
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Attempt to invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
      data: { account_status: "invited" },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/accept-invite`,
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const newUserId = inviteData.user.id;

    // Create the profile if it doesn't exist
    const { error: profileError } = await admin.from("profiles").upsert({
      id: newUserId,
      email: email.trim(),
      stage: "4", // Admins don't need stages, but 4 is safe
      verification_status: "verified",
      account_status: "invited"
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    // Assign the admin role
    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: newUserId, role: "admin" },
      { onConflict: "user_id" }
    );

    if (roleError) {
      return NextResponse.json({ error: "User invited but failed to assign admin role." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Invite sent to ${email}` });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
