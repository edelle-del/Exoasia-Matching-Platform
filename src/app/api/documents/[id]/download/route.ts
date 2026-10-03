import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KYC_BUCKET } from "@/lib/kyc-documents";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: document } = await admin.from("member_documents").select("member_id, file_path").eq("id", id).maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (document.member_id !== user.id) {
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (!role || !["admin", "advisor"].includes(role.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!document.file_path.startsWith(`${document.member_id}/`)) {
    return NextResponse.json({ error: "This submission has no uploaded file. Please resubmit it." }, { status: 409 });
  }
  const { data, error } = await admin.storage.from(KYC_BUCKET).createSignedUrl(document.file_path, 60, { download: true });
  if (error || !data) return NextResponse.json({ error: "Document unavailable" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
