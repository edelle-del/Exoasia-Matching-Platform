import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KYC_BUCKET, KYC_MAX_BYTES, KYC_DOCUMENT_TYPES, validateKycFile } from "@/lib/kyc-documents";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (Number(request.headers.get("content-length")) > KYC_MAX_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "File must be up to 10 MB." }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const documentType = form.get("document_type");
    if (!(file instanceof File) || !KYC_DOCUMENT_TYPES.includes(documentType as typeof KYC_DOCUMENT_TYPES[number])) {
      return NextResponse.json({ error: "Choose a document type and file." }, { status: 400 });
    }
    if (!file.size || file.size > KYC_MAX_BYTES) return NextResponse.json({ error: "Choose a file up to 10 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const invalid = validateKycFile(file.type, file.size, bytes);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const path = `${user.id}/${randomUUID()}.${extension}`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from(KYC_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "Could not upload document. Please try again." }, { status: 500 });
    const { error: insertError } = await supabase.from("member_documents").insert({
      member_id: user.id, document_type: documentType, status: "submitted", file_path: path,
    });
    if (insertError) {
      await admin.storage.from(KYC_BUCKET).remove([path]);
      return NextResponse.json({ error: "Could not save document submission. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not submit document. Please try again." }, { status: 500 });
  }
}
