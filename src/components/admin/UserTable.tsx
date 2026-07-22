"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

const ROLES: Role[] = ["agent", "closer", "admin"];
const ROLE_LABELS: Record<Role, string> = {
  agent: "Sales agent",
  closer: "Closer",
  admin: "Admin",
};

interface Props {
  initialProfiles: Profile[];
}

export default function UserTable({ initialProfiles }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  function patch(id: string, changes: Partial<Profile>) {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
  }

  async function save(profile: Profile) {
    setSavingId(profile.id);
    setError(null);
    setSavedId(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        leaddesk_name: profile.leaddesk_name,
        role: profile.role,
        active: profile.active,
      })
      .eq("id", profile.id);
    if (err) {
      setError(`${profile.full_name || profile.id}: ${err.message}`);
    } else {
      setSavedId(profile.id);
      setTimeout(() => setSavedId((s) => (s === profile.id ? null : s)), 2000);
    }
    setSavingId(null);
  }

  if (profiles.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-gray-500 shadow-sm">
        Nog geen gebruikers. Maak accounts aan in Supabase (Authentication &rarr;
        Users); ze verschijnen hier automatisch.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-white p-5 shadow-sm sm:flex sm:items-end sm:gap-4"
          >
            <div className="flex-1 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  Naam
                </label>
                <input
                  value={p.full_name ?? ""}
                  onChange={(e) => patch(p.id, { full_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  LeadDesk-naam
                </label>
                <input
                  value={p.leaddesk_name ?? ""}
                  onChange={(e) =>
                    patch(p.id, { leaddesk_name: e.target.value })
                  }
                  placeholder="zoals in de CSV"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  Rol
                </label>
                <select
                  value={p.role}
                  onChange={(e) =>
                    patch(p.id, { role: e.target.value as Role })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1 sm:pt-6">
                <input
                  id={`active-${p.id}`}
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => patch(p.id, { active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-mg-green focus:ring-mg-green"
                />
                <label htmlFor={`active-${p.id}`} className="text-sm text-gray-700">
                  Actief
                </label>
              </div>
            </div>

            <button
              onClick={() => save(p)}
              disabled={savingId === p.id}
              className="mt-3 w-full rounded-xl bg-mg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mg-accent disabled:opacity-50 sm:mt-0 sm:w-auto"
            >
              {savingId === p.id
                ? "Opslaan..."
                : savedId === p.id
                  ? "Opgeslagen ✓"
                  : "Opslaan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
