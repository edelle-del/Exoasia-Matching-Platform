import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();

  const { data: requests, error } = await admin
    .from("feature_requests")
    .select("id, title, body, status, created_at, author_id")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authorIds = [...new Set((requests ?? []).map((r) => r.author_id))];
  const requestIds = (requests ?? []).map((r) => r.id);

  const [profilesResult, votesResult, myVotesResult] = await Promise.all([
    authorIds.length > 0
      ? admin.from("profiles").select("id, full_name, member_role").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    requestIds.length > 0
      ? admin.from("feature_request_votes").select("request_id, user_id").in("request_id", requestIds)
      : Promise.resolve({ data: [] }),
    requestIds.length > 0
      ? admin.from("feature_request_votes").select("request_id").eq("user_id", session.user.id).in("request_id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p]),
  );
  const voteCountMap = new Map<string, number>();
  const myVoteSet = new Set((myVotesResult.data ?? []).map((v) => v.request_id));

  for (const vote of votesResult.data ?? []) {
    voteCountMap.set(vote.request_id, (voteCountMap.get(vote.request_id) ?? 0) + 1);
  }

  const result = (requests ?? []).map((r) => ({
    ...r,
    author: profileMap.get(r.author_id) ?? null,
    vote_count: voteCountMap.get(r.id) ?? 0,
    voted_by_me: myVoteSet.has(r.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body } = await req.json() as { title?: string; body?: string };
  if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!body?.trim()) return NextResponse.json({ error: "Description is required." }, { status: 400 });
  if (title.trim().length > 200) return NextResponse.json({ error: "Title max 200 chars." }, { status: 400 });
  if (body.trim().length > 2000) return NextResponse.json({ error: "Description max 2000 chars." }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from("feature_requests")
    .insert({ author_id: session.user.id, title: title.trim(), body: body.trim() })
    .select("id, title, body, status, created_at, author_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, member_role")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({ ...data, author: profile ?? null, vote_count: 0, voted_by_me: false });
}
