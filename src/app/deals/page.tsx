import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/time";

export const revalidate = 0;

export default async function DealsPage() {
  const profile = await requireRole("agent", "closer", "admin");
  const supabase = await createClient();

  const [{ data: deals }, { data: profiles }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("stage", "Deal")
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  const all = (profiles as Profile[]) ?? [];
  const profilesById = Object.fromEntries(all.map((p) => [p.id, p]));

  const allDeals = (deals as Lead[]) ?? [];
  const isAgent = profile.role === "agent";
  const visibleDeals = isAgent
    ? allDeals.filter((d) => d.agent_id === profile.id)
    : allDeals;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
        Deals
      </h1>
      <p className="mb-6 text-gray-500">
        {isAgent
          ? "Leads die door closers succesvol zijn gesloten."
          : "Alle gesloten deals."}
      </p>

      {visibleDeals.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-gray-400">Nog geen deals</p>
          <p className="mt-1 text-sm text-gray-400">
            Zodra een lead naar &ldquo;Deal&rdquo; wordt verplaatst verschijnt hij hier.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDeals.map((deal) => {
            const agent = deal.agent_id
              ? profilesById[deal.agent_id]?.full_name
              : null;
            const closer = deal.closer_id
              ? profilesById[deal.closer_id]?.full_name
              : null;
            return (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-mg-dark">
                    {deal.full_name || "Naamloze lead"}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {deal.phone && <span>{deal.phone}</span>}
                    {deal.extra["stad"] && <span>{deal.extra["stad"]}</span>}
                    {deal.extra["contactpersoon"] && (
                      <span>{deal.extra["contactpersoon"]}</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-gray-400">
                    {agent && <span>Agent: {agent}</span>}
                    {closer && <span>Closer: {closer}</span>}
                    <span>Gesloten {formatDate(deal.updated_at)}</span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                  Deal
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
