import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

// Haalt de ingelogde gebruiker + profiel op (server-side). null als niet ingelogd.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

// Beschermt een server component: redirect naar /login als niet ingelogd,
// naar / als de rol niet is toegestaan.
export async function requireRole(...allowed: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (allowed.length > 0 && !allowed.includes(profile.role)) redirect("/");
  return profile;
}
