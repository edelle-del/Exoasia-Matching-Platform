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

  const { data: threads, error } = await admin
    .from("threads")
    .select("id, body, created_at, author_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authorIds = [...new Set((threads ?? []).map((t) => t.author_id))];
  const threadIds = (threads ?? []).map((t) => t.id);

  const [profilesResult, likesResult, repliesResult, myLikesResult] = await Promise.all([
    authorIds.length > 0
      ? admin.from("profiles").select("id, full_name, member_role").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    threadIds.length > 0
      ? admin.from("thread_likes").select("thread_id, user_id").in("thread_id", threadIds)
      : Promise.resolve({ data: [] }),
    threadIds.length > 0
      ? admin.from("thread_replies").select("thread_id").in("thread_id", threadIds)
      : Promise.resolve({ data: [] }),
    threadIds.length > 0
      ? admin.from("thread_likes").select("thread_id").eq("user_id", session.user.id).in("thread_id", threadIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p]),
  );
  const likeCountMap = new Map<string, number>();
  const replyCountMap = new Map<string, number>();
  const myLikeSet = new Set((myLikesResult.data ?? []).map((l) => l.thread_id));

  for (const like of likesResult.data ?? []) {
    likeCountMap.set(like.thread_id, (likeCountMap.get(like.thread_id) ?? 0) + 1);
  }
  for (const reply of repliesResult.data ?? []) {
    replyCountMap.set(reply.thread_id, (replyCountMap.get(reply.thread_id) ?? 0) + 1);
  }

  const result = (threads ?? []).map((t) => ({
    ...t,
    author: profileMap.get(t.author_id) ?? null,
    like_count: likeCountMap.get(t.id) ?? 0,
    reply_count: replyCountMap.get(t.id) ?? 0,
    liked_by_me: myLikeSet.has(t.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json() as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "Body is required." }, { status: 400 });
  if (body.trim().length > 2000) return NextResponse.json({ error: "Max 2000 characters." }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from("threads")
    .insert({ author_id: session.user.id, body: body.trim() })
    .select("id, body, created_at, author_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, member_role")
    .eq("id", session.user.id)
    .single();

  const authorName = profile?.full_name || "Someone";
  const notifiedUserIds = new Set<string>();
  const mentionRegex = /@\[(.*?)\]\((.*?)\)/g;
  let match;
  while ((match = mentionRegex.exec(body.trim())) !== null) {
    const mentionedUserId = match[2];
    if (mentionedUserId && mentionedUserId !== session.user.id && !notifiedUserIds.has(mentionedUserId)) {
      notifiedUserIds.add(mentionedUserId);
      await admin.from("notifications").insert({
        user_id: mentionedUserId,
        title: "You were mentioned",
        message: `${authorName} mentioned you in a new thread.`,
        link: `/community?thread=${data.id}`
      });
    }
  }

  return NextResponse.json({ ...data, author: profile ?? null, like_count: 0, reply_count: 0, liked_by_me: false });
}

