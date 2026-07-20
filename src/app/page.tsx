import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";
import CardGrid from "@/components/CardGrid";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <AuthProvider>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="mb-1 text-2xl font-bold text-mg-dark sm:text-3xl">
            Bezwaarkaarten
          </h1>
          <p className="mb-6 text-gray-500">
            Klik op een kaart om de route naar de close te bekijken.
          </p>
        </div>
        <CardGrid initialCards={(cards as Card[]) ?? []} />
      </main>
    </AuthProvider>
  );
}
