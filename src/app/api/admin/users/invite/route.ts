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

    // Attempt to generate an invite link
    const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/accept-invite`;
    let linkRes = await admin.auth.admin.generateLink({
      type: "invite",
      email: email.trim(),
      options: {
        redirectTo: acceptUrl,
        data: { account_status: "invited" },
      },
    });

    // If the user already exists, fallback to magic link
    if (linkRes.error?.message?.includes("already registered")) {
       linkRes = await admin.auth.admin.generateLink({
         type: "magiclink",
         email: email.trim(),
         options: { redirectTo: acceptUrl },
       });
    }

    if (linkRes.error) {
      return NextResponse.json({ error: linkRes.error.message }, { status: 400 });
    }

    const actionLink = linkRes.data?.properties?.action_link;
    if (actionLink) {
      const { sendInviteEmailBrevo } = await import("@/lib/email/brevo");
      try {
        await sendInviteEmailBrevo(
          email.trim(),
          actionLink,
          "Founders Arena Admin",
          undefined,
          false
        );
      } catch (err) {
        console.error("Failed to send admin invite email via Brevo:", err);
      }
    }

    const inviteData = linkRes.data;

    let newUserId = inviteData?.user?.id;

    // If for some reason the user ID isn't returned (e.g. magiclink response variation),
    // try to fetch it from existing profiles.
    if (!newUserId) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();
      if (existingProfile?.id) {
        newUserId = existingProfile.id;
      }
    }

    if (newUserId) {
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
        console.error("Failed to assign admin role:", roleError);
      }
    } else {
      console.error("Could not determine user ID to assign admin role. Invite link generated, but role not assigned.");
    }

    return NextResponse.json({ success: true, message: `Invite sent to ${email}`, actionLink });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
