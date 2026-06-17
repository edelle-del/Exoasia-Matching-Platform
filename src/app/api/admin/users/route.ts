import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const search = searchParams.get("search")?.toLowerCase() ?? "";
    const roleFilter = searchParams.get("role") ?? "all";
    const verificationFilter = searchParams.get("verification") ?? "all";

    let query = admin.from("profiles").select("*", { count: "exact" });

    if (roleFilter !== "all") {
      query = query.eq("member_role", roleFilter);
    }
    if (verificationFilter !== "all") {
      query = query.eq("verification_status", verificationFilter);
    }

    // We fetch everything if there's a text search because ILIKE OR on multiple fields 
    // requires advanced PostgREST syntax which can be tricky. We will use the standard or()
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,business_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: profiles, error: profilesError, count } = await query;

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [], total: count ?? 0, page, limit });
    }

    // Fetch user_roles for these profiles
    const profileIds = profiles.map(p => p.id);
    const { data: userRoles } = await admin.from("user_roles").select("user_id, role").in("user_id", profileIds);

    const rolesMap = new Map(userRoles?.map(ur => [ur.user_id, ur.role]));

    // Fetch credits for these profiles
    const { data: creditsData } = await admin.from("ad_credit_ledger").select("member_id, change_amount").in("member_id", profileIds);
    const creditsMap = new Map<string, number>();
    (creditsData || []).forEach(row => {
      const current = creditsMap.get(row.member_id) ?? 0;
      creditsMap.set(row.member_id, current + row.change_amount);
    });

    const users = profiles.map(p => ({
      ...p,
      app_role: rolesMap.get(p.id) ?? "member",
      credits: creditsMap.get(p.id) ?? 0,
    }));

    return NextResponse.json({
      users,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
