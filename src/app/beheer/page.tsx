import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import UserTable from "@/components/admin/UserTable";

export const revalidate = 0;

export default async function BeheerPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">Beheer</h1>
      <p className="mb-6 text-gray-500">
        Beheer gebruikers, hun rol en hun LeadDesk-naam voor CSV-matching.
      </p>
      <UserTable initialProfiles={(data as Profile[]) ?? []} />
    </main>
  );
}
