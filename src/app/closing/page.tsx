import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile, Appointment } from "@/lib/types";
import BoardWorkspace from "@/components/board/BoardWorkspace";

export const revalidate = 0;

export default async function ClosingPage() {
  const profile = await requireRole("closer", "admin");
  const supabase = await createClient();

  const [{ data: leads }, { data: profiles }, { data: appts }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("funnel", "closing")
        .order("updated_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("appointments").select("*"),
    ]);

  const all = (profiles as Profile[]) ?? [];
  const profilesById = Object.fromEntries(all.map((p) => [p.id, p]));
  const closers = all.filter((p) => p.role === "closer" && p.active);

  // Admin mag kiezen wiens bord/agenda; een closer ziet alleen zichzelf.
  const personFilter = profile.role === "admin" ? closers : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
        Closing
      </h1>
      <p className="mb-6 text-gray-500">
        Doorgezette leads. Kies wiens bord en agenda je bekijkt.
      </p>
      <BoardWorkspace
        initialLeads={(leads as Lead[]) ?? []}
        initialAppointments={(appts as Appointment[]) ?? []}
        funnel="closing"
        closers={closers}
        profilesById={profilesById}
        people={all.filter((p) => p.active)}
        currentUserId={profile.id}
        currentUserRole={profile.role}
        personFilter={personFilter}
      />
    </main>
  );
}
