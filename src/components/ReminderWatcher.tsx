"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

type ApptWithLead = Appointment & {
  lead?: { full_name: string | null; phone: string | null } | null;
};

const DISMISS_KEY = "mg-reminders-dismissed";

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function ReminderWatcher() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<ApptWithLead[]>([]);
  const [dueId, setDueId] = useState<string | null>(null);
  const dismissed = useRef<Set<string>>(new Set());
  const snoozed = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    dismissed.current = new Set(loadDismissed());
  }, []);

  const fetchAppts = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("appointments")
      .select("*, lead:leads(full_name, phone)")
      .eq("owner_id", user.id)
      .gte("starts_at", since)
      .lte("starts_at", until)
      .order("starts_at", { ascending: true });
    setAppts((data as ApptWithLead[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchAppts();
    const i = setInterval(fetchAppts, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, [fetchAppts]);

  useEffect(() => {
    if (!user) return;
    function check() {
      const now = Date.now();
      for (const a of appts) {
        if (dismissed.current.has(a.id)) continue;
        const snoozeUntil = snoozed.current.get(a.id);
        if (snoozeUntil && now < snoozeUntil) continue;
        if (new Date(a.starts_at).getTime() <= now) {
          setDueId(a.id);
          return;
        }
      }
    }
    check();
    const i = setInterval(check, 30 * 1000);
    return () => clearInterval(i);
  }, [appts, user]);

  if (!user || !dueId) return null;
  const appt = appts.find((a) => a.id === dueId);
  if (!appt) return null;

  const name = appt.lead?.full_name || appt.title || "Lead";
  const phone = appt.lead?.phone;

  function dismiss() {
    dismissed.current.add(dueId!);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed.current]));
    setDueId(null);
  }
  function snooze() {
    snoozed.current.set(dueId!, Date.now() + 10 * 60 * 1000);
    setDueId(null);
  }

  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-mg-green/30 bg-white p-5 shadow-xl">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-mg-green">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
          </svg>
          {appt.type === "closing" ? "Closing-afspraak" : "Tijd om te bellen"}
        </div>
        <p className="text-lg font-bold text-mg-dark">{name}</p>
        <p className="text-sm text-gray-500">{formatDateTime(appt.starts_at)}</p>

        <div className="mt-4 flex gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex-1 rounded-xl bg-mg-green py-2.5 text-center text-sm font-bold text-white hover:bg-mg-accent"
            >
              Bel {phone}
            </a>
          )}
          <button
            onClick={snooze}
            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            10 min
          </button>
          <button
            onClick={dismiss}
            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Gezien
          </button>
        </div>
      </div>
    </div>
  );
}
