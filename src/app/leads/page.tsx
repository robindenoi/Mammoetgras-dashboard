import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types";
import FunnelBoard from "@/components/board/FunnelBoard";

export const revalidate = 0;

export default async function LeadsPage() {
  const profile = await requireRole("agent", "admin");
  const supabase = await createClient();

  const [{ data: leads }, { data: profiles }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("funnel", "agent")
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  const all = (profiles as Profile[]) ?? [];
  const profilesById = Object.fromEntries(all.map((p) => [p.id, p]));
  const closers = all.filter((p) => p.role === "closer" && p.active);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
        Mijn leads
      </h1>
      <p className="mb-6 text-gray-500">
        Volg je leads op en zet ze door zodra ze klaar zijn voor een closer.
      </p>
      <FunnelBoard
        initialLeads={(leads as Lead[]) ?? []}
        funnel="agent"
        closers={closers}
        profilesById={profilesById}
        currentUserId={profile.id}
      />
    </main>
  );
}
