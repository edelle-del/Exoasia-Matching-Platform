import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { CreateAnnouncementForm } from "./_components/CreateAnnouncementForm";
import { AnnouncementCard } from "./_components/AnnouncementCard";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const role = getRoleFromAccessToken(session?.access_token);
  const canCreate = role === "admin" || role === "advisor";

  // Fetch announcements with their likes
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("*, announcement_likes(user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-(--color-ink)">Announcements</h1>
          <p className="mt-2 text-sm text-(--color-muted)">Platform updates, feature releases, and community news.</p>
        </div>
        {canCreate && <CreateAnnouncementForm />}
      </div>

      <div className="space-y-6">
        {!announcements || announcements.length === 0 ? (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) py-12 text-center">
            <p className="text-sm font-semibold text-(--color-ink)">No announcements yet</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const likes = announcement.announcement_likes || [];
            const initialLikes = likes.length;
            const initialLiked = likes.some((like: any) => like.user_id === user.id);

            return (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                currentUserId={user.id}
                canDelete={canCreate}
                initialLikes={initialLikes}
                initialLiked={initialLiked}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
