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
  let canManage = role === "admin" || role === "advisor";

  if (!canManage && session?.user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", session.user.id)
      .single();
      
    if (profile?.member_role === "ecosystem_partner") {
      canManage = true;
    }
  }

  // Fetch announcements with their likes
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("*, announcement_likes(user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
  }

  // Determine the main announcement
  const featuredAnnouncement = announcements?.find((a) => a.is_featured);
  const mainAnnouncement = featuredAnnouncement || announcements?.[0];
  
  // The rest of the announcements
  const otherAnnouncements = announcements?.filter(
    (a) => a.id !== mainAnnouncement?.id
  ) || [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-(--color-ink)">Announcements</h1>
          <p className="mt-2 text-sm text-(--color-muted)">Platform updates, feature releases, and community news.</p>
        </div>
        {canManage && <CreateAnnouncementForm />}
      </div>

      {!announcements || announcements.length === 0 ? (
        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) py-12 text-center">
          <p className="text-sm font-semibold text-(--color-ink)">No announcements yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
          {/* Main Announcement (Left Side) */}
          {mainAnnouncement && (
            <div className="lg:col-span-2">
              <AnnouncementCard
                announcement={mainAnnouncement}
                currentUserId={user.id}
                canDelete={canManage}
                canEdit={canManage}
                initialLikes={mainAnnouncement.announcement_likes?.length || 0}
                initialLiked={mainAnnouncement.announcement_likes?.some((like: any) => like.user_id === user.id) || false}
                isMain={true}
              />
            </div>
          )}

          {/* Other Announcements (Right Side) */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-widest text-(--color-muted) mb-4">Previous Updates</h3>
            {otherAnnouncements.length === 0 ? (
               <p className="text-xs text-(--color-muted)">No other announcements.</p>
            ) : (
              otherAnnouncements.map((announcement) => {
                const likes = announcement.announcement_likes || [];
                const initialLikes = likes.length;
                const initialLiked = likes.some((like: any) => like.user_id === user.id);

                return (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    currentUserId={user.id}
                    canDelete={canManage}
                    canEdit={canManage}
                    initialLikes={initialLikes}
                    initialLiked={initialLiked}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
