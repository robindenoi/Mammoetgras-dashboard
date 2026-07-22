"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lead, Profile } from "@/lib/types";

interface Props {
  lead: Lead;
  closers: Profile[];
  onConfirm: (closerId: string) => Promise<void>;
  onClose: () => void;
}

export default function HandoffModal({
  lead,
  closers,
  onConfirm,
  onClose,
}: Props) {
  const [chosen, setChosen] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const active = closers.filter((c) => c.active);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <h2 className="text-lg font-bold text-mg-dark">Doorzetten naar closer</h2>
        <p className="mt-1 text-sm text-gray-500">
          {lead.full_name || "Deze lead"} gaat naar de closing-funnel. Kies wie
          hem oppakt.
        </p>

        <div className="mt-4 space-y-2">
          {active.length === 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              Er zijn nog geen actieve closers. Vraag de admin om er een in te
              stellen via Beheer.
            </p>
          )}
          {active.map((c) => (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 transition-colors ${
                chosen === c.id
                  ? "border-mg-green bg-mg-green/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="closer"
                  value={c.id}
                  checked={chosen === c.id}
                  onChange={() => setChosen(c.id)}
                  className="h-4 w-4 text-mg-green focus:ring-mg-green"
                />
                <span className="font-medium text-gray-800">
                  {c.full_name || c.id}
                </span>
              </div>
              <Link
                href={`/agenda?owner=${c.id}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-mg-green hover:underline"
              >
                agenda bekijken
              </Link>
            </label>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Annuleren
          </button>
          <button
            disabled={!chosen || busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm(chosen);
              setBusy(false);
            }}
            className="flex-1 rounded-xl bg-mg-green py-3 text-sm font-bold text-white hover:bg-mg-accent disabled:opacity-50"
          >
            {busy ? "Bezig..." : "Doorzetten"}
          </button>
        </div>
      </div>
    </div>
  );
}
