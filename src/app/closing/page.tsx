import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types";
import FunnelBoard from "@/components/board/FunnelBoard";

export const revalidate = 0;

export default async function ClosingPage() {
  const profile = await requireRole("closer", "admin");
  const supabase = await createClient();

  const [{ data: leads }, { data: profiles }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("funnel", "closing")
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  const all = (profiles as Profile[]) ?? [];
  const profilesById = Object.fromEntries(all.map((p) => [p.id, p]));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
        Closing
      </h1>
      <p className="mb-6 text-gray-500">
        Leads die aan jou zijn doorgezet. Rond ze af tot de deal.
      </p>
      <FunnelBoard
        initialLeads={(leads as Lead[]) ?? []}
        funnel="closing"
        closers={[]}
        profilesById={profilesById}
        currentUserId={profile.id}
      />
    </main>
  );
}
