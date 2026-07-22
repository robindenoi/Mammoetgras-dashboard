import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Appointment, Profile } from "@/lib/types";
import AgendaView from "@/components/calendar/AgendaView";

export const revalidate = 0;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const profile = await requireRole("agent", "closer", "admin");
  const { owner } = await searchParams;
  const supabase = await createClient();

  const [{ data: appts }, { data: profiles }] = await Promise.all([
    supabase.from("appointments").select("*"),
    supabase.from("profiles").select("*").eq("active", true),
  ]);

  const people = ((profiles as Profile[]) ?? []).sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "")
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">Agenda</h1>
      <p className="mb-6 text-gray-500">
        Terugbel- en closing-afspraken. Filter per persoon om te zien wie
        wanneer bezet is.
      </p>
      <AgendaView
        initialAppointments={(appts as Appointment[]) ?? []}
        people={people}
        currentUserId={profile.id}
        defaultOwner={owner ?? "all"}
      />
    </main>
  );
}
