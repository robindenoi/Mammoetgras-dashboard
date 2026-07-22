import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import CsvImporter from "@/components/import/CsvImporter";

export const revalidate = 0;

export default async function ImportPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("active", true)
    .order("full_name", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
        Leads importeren
      </h1>
      <p className="mb-6 text-gray-500">
        Upload een CSV uit LeadDesk, koppel de kolommen en wijs de leads toe aan
        de juiste agent.
      </p>
      <CsvImporter profiles={(data as Profile[]) ?? []} />
    </main>
  );
}
