import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile, Appointment } from "@/lib/types";
import BoardWorkspace from "@/components/board/BoardWorkspace";

export const revalidate = 0;

export default async function LeadsPage() {
  const profile = await requireRole("agent", "admin");
  const supabase = await createClient();

  const [{ data: leads }, { data: handedOff }, { data: profiles }, { data: appts }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("funnel", "agent")
        .order("updated_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, closer_id")
        .eq("agent_id", profile.id)
        .eq("funnel", "closing"),
      supabase.from("profiles").select("*"),
      supabase.from("appointments").select("*"),
    ]);

  const all = (profiles as Profile[]) ?? [];
  const profilesById = Object.fromEntries(all.map((p) => [p.id, p]));
  const closers = all.filter((p) => p.role === "closer" && p.active);

  const handedOffMap: Record<string, string> = {};
  for (const h of (handedOff ?? []) as { id: string; closer_id: string | null }[]) {
    if (h.closer_id) handedOffMap[h.id] = h.closer_id;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
        Mijn leads
      </h1>
      <p className="mb-6 text-gray-500">
        Volg je leads op, plan terugbelmomenten en zet ze door naar een closer.
      </p>
      <BoardWorkspace
        initialLeads={(leads as Lead[]) ?? []}
        initialAppointments={(appts as Appointment[]) ?? []}
        funnel="agent"
        closers={closers}
        profilesById={profilesById}
        people={all.filter((p) => p.active)}
        currentUserId={profile.id}
        currentUserRole={profile.role}
        handedOffLeadCloser={handedOffMap}
      />
    </main>
  );
}
