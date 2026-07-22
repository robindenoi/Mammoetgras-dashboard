"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile, Role } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function loadProfile(u: User | null) {
      if (!u) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      if (active) setProfile((data as Profile) ?? null);
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active) return;
      setUser(user);
      await loadProfile(user);
      if (active) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      if (!active) return;
      setUser(u);
      await loadProfile(u);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, profile, role: profile?.role ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
