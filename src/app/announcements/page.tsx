import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { CreateAnnouncementForm } from "./_components/CreateAnnouncementForm";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const role = getRoleFromAccessToken(session?.access_token);
  const canCreate = role === "admin" || role === "advisor";

  // Fetch announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

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
          announcements.map((announcement) => (
            <div key={announcement.id} className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6">
              {announcement.is_featured && (
                <span className="mb-3 inline-block rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-(--color-primary)">
                  Featured
                </span>
              )}
              <h2 className="text-xl font-bold text-(--color-ink)">{announcement.title}</h2>
              <p className="mt-1 text-xs text-(--color-muted)">
                {new Date(announcement.created_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
              <div className="mt-4 text-sm text-(--color-body) whitespace-pre-wrap leading-relaxed">
                {announcement.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
