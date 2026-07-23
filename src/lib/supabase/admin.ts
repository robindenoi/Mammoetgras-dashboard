import { createClient } from "@supabase/supabase-js";

// Server-only client met de service-role sleutel. Omzeilt RLS, dus UITSLUITEND
// gebruiken in server-side API-routes (nooit importeren in client-componenten).
// De achtergrondtaak voor WhatsApp-reminders moet afspraken van álle gebruikers
// kunnen lezen; daarvoor is deze elevated client nodig.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY of NEXT_PUBLIC_SUPABASE_URL ontbreekt.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
