"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err || !data.user) {
      setError("Ongeldige inloggegevens. Probeer het opnieuw.");
      setLoading(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    let dest = next;
    if (!dest) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      dest = profile?.role === "closer" ? "/closing" : "/leads";
    }

    router.push(dest);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mg-light px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-mg-dark">Inloggen</h1>
          <p className="mt-2 text-sm text-gray-500">
            Log in met je Mammoetgras-account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                E-mailadres
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                placeholder="joey@mammoetgras.nl"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Wachtwoord
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-mg-green py-3 text-sm font-bold text-white transition-colors hover:bg-mg-accent disabled:opacity-50"
          >
            {loading ? "Inloggen..." : "Inloggen"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          <a href="/" className="hover:underline">
            &larr; Terug naar bezwaarkaarten
          </a>
        </p>
      </div>
    </div>
  );
}
