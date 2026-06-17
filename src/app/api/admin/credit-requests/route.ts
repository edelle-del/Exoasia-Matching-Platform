import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify admin role
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch credit requests with profile info
    const { data: requests, error } = await admin
      .from("credit_requests")
      .select(`
        *,
        profiles:user_id (
          full_name,
          business_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error("Fetch Credit Requests Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
