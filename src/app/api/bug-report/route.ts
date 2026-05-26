import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, description, steps } = await request.json() as {
      subject?: string;
      description?: string;
      steps?: string;
    };

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    const { error } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      subject: subject.trim(),
      description: description.trim(),
      steps: steps?.trim() || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit report." },
      { status: 500 },
    );
  }
}
